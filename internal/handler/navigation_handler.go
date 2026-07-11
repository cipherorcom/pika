package handler

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/go-orz/orz"
	"github.com/labstack/echo/v4"
	"go.uber.org/zap"
)

const maxNavigationCSVSize = 2 << 20

var navigationHTTPClient = &http.Client{Timeout: 10 * time.Second}

// NavigationLink 是公共导航站中的一个链接项。
type NavigationLink struct {
	Category string `json:"category"`
	Name     string `json:"name"`
	URL      string `json:"url"`
	Desc     string `json:"desc"`
}

// GetNavigation 从已配置的公开 Google Sheets 读取导航链接。
func (h *PropertyHandler) GetNavigation(c echo.Context) error {
	config, err := h.service.GetSystemConfig(c.Request().Context())
	if err != nil {
		h.logger.Error("获取导航站配置失败", zap.Error(err))
		return orz.NewError(http.StatusInternalServerError, "获取导航站配置失败")
	}
	if !config.NavigationEnabled {
		return orz.NewError(http.StatusNotFound, "导航站未启用")
	}

	items, err := fetchNavigationLinks(c.Request().Context(), config.NavigationSheetURL)
	if err != nil {
		h.logger.Error("读取 Google 导航表格失败", zap.Error(err))
		return orz.NewError(http.StatusBadGateway, "读取 Google 表格失败，请检查公开权限和表格地址")
	}

	c.Response().Header().Set("Cache-Control", "public, max-age=300")
	return orz.Ok(c, items)
}

func fetchNavigationLinks(ctx context.Context, sheetURL string) ([]NavigationLink, error) {
	csvURL, err := navigationCSVURL(sheetURL)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, csvURL, nil)
	if err != nil {
		return nil, fmt.Errorf("创建 Google 表格请求失败: %w", err)
	}

	resp, err := navigationHTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("请求 Google 表格失败: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return nil, fmt.Errorf("Google 表格响应异常: %s", resp.Status)
	}

	return parseNavigationCSV(io.LimitReader(resp.Body, maxNavigationCSVSize))
}

// navigationCSVURL 将常见的 Google Sheets 编辑链接转换成公开 CSV 导出链接。
func navigationCSVURL(rawURL string) (string, error) {
	parsed, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil {
		return "", fmt.Errorf("Google 表格地址格式无效: %w", err)
	}
	if parsed.Scheme != "https" || !strings.EqualFold(parsed.Hostname(), "docs.google.com") {
		return "", fmt.Errorf("仅支持 docs.google.com 的 HTTPS Google 表格地址")
	}

	pathParts := strings.Split(strings.Trim(parsed.Path, "/"), "/")
	if len(pathParts) < 3 || pathParts[0] != "spreadsheets" || pathParts[1] != "d" || pathParts[2] == "" {
		return "", fmt.Errorf("Google 表格地址无效")
	}

	gid := parsed.Query().Get("gid")
	if gid == "" {
		fragment, _ := url.ParseQuery(parsed.Fragment)
		gid = fragment.Get("gid")
	}
	if gid == "" {
		gid = "0"
	}

	return fmt.Sprintf("https://docs.google.com/spreadsheets/d/%s/export?format=csv&gid=%s", url.PathEscape(pathParts[2]), url.QueryEscape(gid)), nil
}

func parseNavigationCSV(source io.Reader) ([]NavigationLink, error) {
	reader := csv.NewReader(source)
	reader.FieldsPerRecord = -1
	records, err := reader.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("解析 Google 表格 CSV 失败: %w", err)
	}
	if len(records) == 0 {
		return []NavigationLink{}, nil
	}

	columns := make(map[string]int, len(records[0]))
	for index, header := range records[0] {
		columns[strings.ToLower(strings.TrimSpace(strings.TrimPrefix(header, "\ufeff")))] = index
	}
	for _, required := range []string{"category", "name", "url", "desc"} {
		if _, exists := columns[required]; !exists {
			return nil, fmt.Errorf("表格缺少 %s 列", required)
		}
	}

	valueAt := func(record []string, column string) string {
		index := columns[column]
		if index >= len(record) {
			return ""
		}
		return strings.TrimSpace(record[index])
	}

	items := make([]NavigationLink, 0, len(records)-1)
	for _, record := range records[1:] {
		linkURL := valueAt(record, "url")
		parsedURL, err := url.Parse(linkURL)
		if err != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") || parsedURL.Host == "" {
			continue
		}

		category := valueAt(record, "category")
		if category == "" {
			category = "未分类"
		}
		name := valueAt(record, "name")
		if name == "" {
			name = parsedURL.Host
		}

		items = append(items, NavigationLink{
			Category: category,
			Name:     name,
			URL:      linkURL,
			Desc:     valueAt(record, "desc"),
		})
	}

	return items, nil
}
