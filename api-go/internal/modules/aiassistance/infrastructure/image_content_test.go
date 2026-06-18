package aiinfra

import (
	"context"
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestFetchInlineImages_ParallelOrdered(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/jpeg")
		_, _ = w.Write([]byte("img" + r.URL.Path))
	}))
	defer srv.Close()

	urls := []string{srv.URL + "/1", srv.URL + "/2", srv.URL + "/3"}
	imgs, err := fetchInlineImages(context.Background(), srv.Client(), "", urls)
	if err != nil {
		t.Fatalf("fetch: %v", err)
	}
	if len(imgs) != 3 {
		t.Fatalf("len = %d, want 3", len(imgs))
	}
	// 順序維持を確認（並列でもindex順）。
	for i, want := range []string{"img/1", "img/2", "img/3"} {
		data, _ := base64.StdEncoding.DecodeString(imgs[i].Base64)
		if string(data) != want {
			t.Errorf("imgs[%d] = %q, want %q", i, data, want)
		}
		if imgs[i].MimeType != "image/jpeg" {
			t.Errorf("mime = %q", imgs[i].MimeType)
		}
	}
}

func TestFetchInlineImages_RejectsNonImage(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		_, _ = w.Write([]byte("nope"))
	}))
	defer srv.Close()
	if _, err := fetchInlineImages(context.Background(), srv.Client(), "", []string{srv.URL}); err == nil {
		t.Fatal("expected error for non-image content-type")
	}
}

func TestFetchInlineImages_FailFastOnOneFailure(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/bad" {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "image/jpeg")
		_, _ = w.Write([]byte("ok"))
	}))
	defer srv.Close()
	if _, err := fetchInlineImages(context.Background(), srv.Client(), "", []string{srv.URL + "/ok", srv.URL + "/bad"}); err == nil {
		t.Fatal("expected fail-fast error when one image fails")
	}
}

func TestFetchInlineImages_Empty(t *testing.T) {
	if _, err := fetchInlineImages(context.Background(), http.DefaultClient, "", nil); err == nil {
		t.Fatal("expected error for empty urls")
	}
}

func TestToFetchableImageURL_Rewrite(t *testing.T) {
	got := toFetchableImageURL("https://storage.googleapis.com/storage/v1/b/marketplace-images/o",
		"http://localhost:4443/marketplace-images/listings/abc.jpg")
	want := "https://storage.googleapis.com/storage/v1/b/marketplace-images/o/listings%2Fabc.jpg?alt=media"
	if got != want {
		t.Errorf("rewrite = %q, want %q", got, want)
	}
	// base未設定はそのまま
	if toFetchableImageURL("", "http://x/y.jpg") != "http://x/y.jpg" {
		t.Error("empty base should return original")
	}
}
