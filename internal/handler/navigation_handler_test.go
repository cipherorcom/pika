package handler

import (
	"strings"
	"testing"
)

func TestNavigationCSVURL(t *testing.T) {
	got, err := navigationCSVURL("https://docs.google.com/spreadsheets/d/sheet-id/edit#gid=123")
	if err != nil {
		t.Fatalf("navigationCSVURL() returned error: %v", err)
	}
	want := "https://docs.google.com/spreadsheets/d/sheet-id/export?format=csv&gid=123"
	if got != want {
		t.Fatalf("navigationCSVURL() = %q, want %q", got, want)
	}
}

func TestParseNavigationCSV(t *testing.T) {
	csvData := "category,name,url,desc\n工具,搜索,https://www.google.com,Google 搜索\n工具,,https://example.com,\n忽略,危险链接,javascript:alert(1),不会出现\n"
	items, err := parseNavigationCSV(strings.NewReader(csvData))
	if err != nil {
		t.Fatalf("parseNavigationCSV() returned error: %v", err)
	}
	if len(items) != 2 {
		t.Fatalf("parseNavigationCSV() returned %d items, want 2", len(items))
	}
	if items[1].Name != "example.com" {
		t.Fatalf("fallback name = %q, want example.com", items[1].Name)
	}
}
