package service

import (
	"testing"

	"github.com/dushixiang/pika/internal/models"
)

func TestApplySystemConfigDefaultsKeepsNavigationPublicForLegacyConfig(t *testing.T) {
	config := &models.SystemConfig{}
	applySystemConfigDefaults(config, `{"navigationEnabled":true}`)

	if !config.NavigationAnonymousAccess {
		t.Fatal("legacy navigation config should keep anonymous access enabled")
	}
}

func TestApplySystemConfigDefaultsHonorsPrivateNavigation(t *testing.T) {
	config := &models.SystemConfig{}
	applySystemConfigDefaults(config, `{"navigationAnonymousAccess":false}`)

	if config.NavigationAnonymousAccess {
		t.Fatal("explicit private navigation config should disable anonymous access")
	}
}
