package service

import (
	"reflect"
	"testing"
)

func TestWxPusherConfigTargetParsing(t *testing.T) {
	tests := []struct {
		name  string
		input interface{}
		want  []string
	}{
		{name: "json decoded list", input: []interface{}{" UID_one ", "", "UID_two"}, want: []string{"UID_one", "UID_two"}},
		{name: "typed list", input: []string{" UID_one ", "UID_two"}, want: []string{"UID_one", "UID_two"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := stringSlice(tt.input); !reflect.DeepEqual(got, tt.want) {
				t.Fatalf("stringSlice() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestWxPusherConfigTopicParsing(t *testing.T) {
	tests := []struct {
		name  string
		input interface{}
		want  []int
	}{
		{name: "json decoded list", input: []interface{}{float64(12), float64(0), float64(34.5), float64(56)}, want: []int{12, 56}},
		{name: "typed list", input: []int{12, 0, -1, 56}, want: []int{12, 56}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := intSlice(tt.input); !reflect.DeepEqual(got, tt.want) {
				t.Fatalf("intSlice() = %v, want %v", got, tt.want)
			}
		})
	}
}
