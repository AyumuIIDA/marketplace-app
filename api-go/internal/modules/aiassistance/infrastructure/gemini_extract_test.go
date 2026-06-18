package aiinfra

import "testing"

func TestExtractJSONText(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want string
	}{
		{"plain", `{"title":"x"}`, `{"title":"x"}`},
		{"fenced json", "```json\n{\"title\":\"x\"}\n```", `{"title":"x"}`},
		{"fenced bare", "```\n{\"a\":1}\n```", `{"a":1}`},
		{"prose around", "Here is the result:\n{\"a\":1}\nThanks!", `{"a":1}`},
		{"fenced uppercase", "```JSON\n{\"a\":1}\n```", `{"a":1}`},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := extractJSONText(c.in); got != c.want {
				t.Errorf("extractJSONText(%q) = %q, want %q", c.in, got, c.want)
			}
		})
	}
}

func TestToFetchableImageURL_SkipsAlreadyRewritten(t *testing.T) {
	base := "http://storage:4443/storage/v1/b/marketplace-images/o"
	// 既にGCS media URL → 再書き換えしない（二重書き換え防止）。
	already := "http://storage:4443/storage/v1/b/marketplace-images/o/listings%2Fabc.jpg?alt=media"
	if got := toFetchableImageURL(base, already); got != already {
		t.Errorf("already-rewritten URL should pass through; got %q", got)
	}
	// 公開URL → media URL へ書き換え。
	public := "http://localhost:4443/marketplace-images/listings/abc.jpg"
	want := base + "/listings%2Fabc.jpg?alt=media"
	if got := toFetchableImageURL(base, public); got != want {
		t.Errorf("rewrite = %q, want %q", got, want)
	}
}
