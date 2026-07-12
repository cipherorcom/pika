package assets

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/dushixiang/pika/internal/models"
)

type testSystemConfigProvider struct {
	config *models.SystemConfig
}

func testIntPtr(value int) *int {
	return &value
}

func (p testSystemConfigProvider) GetSystemConfig(context.Context) (*models.SystemConfig, error) {
	return p.config, nil
}

func TestRenderUIFilesInDir(t *testing.T) {
	dir := t.TempDir()
	indexPath := filepath.Join(dir, "index.html")
	src := `<!doctype html>
<title>[[.SystemNameZh]][[if and .SystemNameZh .SystemNameEn]] | [[end]][[.SystemNameEn]]</title>
<script>
window.SystemConfig = {
    SystemNameZh: "[[.SystemNameZh]]",
    SystemNameEn: "[[.SystemNameEn]]",
    ICPCode: "[[.ICPCode]]",
    DefaultView: "[[.DefaultView]]",
    BackgroundOverlayOpacity: Number("[[if .BackgroundOverlayOpacity]][[.BackgroundOverlayOpacity]][[else]]65[[end]]"),
    ChromeBlur: Number("[[if .ChromeBlur]][[.ChromeBlur]][[else]]24[[end]]"),
    NavigationEnabled: "[[.NavigationEnabled]]" === "true",
	NavigationAnonymousAccess: "[[.NavigationAnonymousAccess]]" !== "false",
    NavigationSheetURL: "[[.NavigationSheetURL]]",
    Version: "[[.Version]]",
};
</script>
<script>/*__PIKA_CUSTOM_JS__*/</script>
<style>/*__PIKA_CUSTOM_CSS__*/</style>`
	if err := os.WriteFile(indexPath, []byte(src), 0644); err != nil {
		t.Fatal(err)
	}

	provider := testSystemConfigProvider{
		config: &models.SystemConfig{
			SystemNameZh:              "皮卡监控",
			SystemNameEn:              "Pika Monitor",
			ICPCode:                   "ICP-1",
			DefaultView:               "grid",
			BackgroundOverlayOpacity:  testIntPtr(65),
			ChromeBlur:                testIntPtr(24),
			NavigationEnabled:         true,
			NavigationAnonymousAccess: false,
			NavigationSheetURL:        "https://docs.google.com/spreadsheets/d/example/edit",
			CustomJS:                  `console.log("pika");`,
			CustomCSS:                 `body { color: red; }`,
			Version:                   "v1.2.3",
		},
	}
	if err := RenderUIFilesInDir(dir, provider); err != nil {
		t.Fatal(err)
	}

	rendered, err := os.ReadFile(indexPath)
	if err != nil {
		t.Fatal(err)
	}
	html := string(rendered)
	for _, want := range []string{
		"<title>皮卡监控 | Pika Monitor</title>",
		`SystemNameZh: "皮卡监控"`,
		`Version: "v1.2.3"`,
		`BackgroundOverlayOpacity: Number("65")`,
		`ChromeBlur: Number("24")`,
		`NavigationEnabled: "true" === "true"`,
		`NavigationAnonymousAccess: "false" !== "false"`,
		`NavigationSheetURL: "https://docs.google.com/spreadsheets/d/example/edit"`,
		`console.log("pika");`,
		`body { color: red; }`,
	} {
		if !strings.Contains(html, want) {
			t.Fatalf("rendered index.html missing %q:\n%s", want, html)
		}
	}
	if _, err := os.Stat(filepath.Join(dir, "index.html.tmpl")); err != nil {
		t.Fatal(err)
	}
}

func TestEnsureIndexTemplateRefreshesAfterViteBuild(t *testing.T) {
	dir := t.TempDir()
	indexPath := filepath.Join(dir, "index.html")
	tmplPath := filepath.Join(dir, "index.html.tmpl")
	if err := os.WriteFile(tmplPath, []byte(`<script src="/assets/old.js"></script>`), 0644); err != nil {
		t.Fatal(err)
	}
	newBuild := `<script>window.SystemConfig = "[[.SystemNameEn]]"</script><script src="/assets/new.js"></script>`
	if err := os.WriteFile(indexPath, []byte(newBuild), 0644); err != nil {
		t.Fatal(err)
	}

	if err := ensureIndexTemplate(dir); err != nil {
		t.Fatal(err)
	}
	updatedTemplate, err := os.ReadFile(tmplPath)
	if err != nil {
		t.Fatal(err)
	}
	if string(updatedTemplate) != newBuild {
		t.Fatalf("index template was not refreshed after build: %s", updatedTemplate)
	}
}
