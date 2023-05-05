package hashicorpdocs

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"google.golang.org/api/docs/v1"
)

func TestParseParagraphWithEmails(t *testing.T) {
	tests := []struct {
		testName string
		label    string
		para     *docs.Paragraph
		want     []string
	}{
		{
			"Empty paragraph",
			"Contributors",
			&docs.Paragraph{},
			[]string{},
		},
		{
			"N/A contributor",
			"Contributor",
			&docs.Paragraph{
				Elements: []*docs.ParagraphElement{
					{
						EndIndex:   214,
						StartIndex: 202,
						TextRun: &docs.TextRun{
							Content: "Contributors",
							TextStyle: &docs.TextStyle{
								Bold: true,
								FontSize: &docs.Dimension{
									Magnitude: 8,
									Unit:      "PT",
								},
							},
						},
					},
					{
						EndIndex:   220,
						StartIndex: 214,
						TextRun: &docs.TextRun{
							Content: ": N/A\n",
							TextStyle: &docs.TextStyle{
								Bold: true,
								FontSize: &docs.Dimension{
									Magnitude: 8,
									Unit:      "PT",
								},
							},
						},
					},
				},
			},
			[]string{},
		},
		{
			"One contributor",
			"Contributor",
			&docs.Paragraph{
				Elements: []*docs.ParagraphElement{
					{
						EndIndex:   214,
						StartIndex: 202,
						TextRun: &docs.TextRun{
							Content: "Contributors",
							TextStyle: &docs.TextStyle{
								Bold: true,
								FontSize: &docs.Dimension{
									Magnitude: 8,
									Unit:      "PT",
								},
							},
						},
					},
					{
						EndIndex:   239,
						StartIndex: 214,
						TextRun: &docs.TextRun{
							Content: ": testuser@hashicorp.com\n",
							TextStyle: &docs.TextStyle{
								Bold: true,
								FontSize: &docs.Dimension{
									Magnitude: 8,
									Unit:      "PT",
								},
							},
						},
					},
				},
			},
			[]string{"testuser@hashicorp.com"},
		},
		{
			"Two contributors",
			"Contributor",
			&docs.Paragraph{
				Elements: []*docs.ParagraphElement{
					{
						EndIndex:   214,
						StartIndex: 202,
						TextRun: &docs.TextRun{
							Content: "Contributors",
							TextStyle: &docs.TextStyle{
								Bold: true,
								FontSize: &docs.Dimension{
									Magnitude: 8,
									Unit:      "PT",
								},
							},
						},
					},
					{
						EndIndex:   216,
						StartIndex: 214,
						TextRun: &docs.TextRun{
							Content: ": ",
							TextStyle: &docs.TextStyle{
								Bold: true,
								FontSize: &docs.Dimension{
									Magnitude: 8,
									Unit:      "PT",
								},
							},
						},
					},
					{
						EndIndex:   239,
						StartIndex: 216,
						TextRun: &docs.TextRun{
							Content: "testuser1@hashicorp.com",
							TextStyle: &docs.TextStyle{
								Bold: true,
								FontSize: &docs.Dimension{
									Magnitude: 8,
									Unit:      "PT",
								},
							},
						},
					},
					{
						EndIndex:   265,
						StartIndex: 239,
						TextRun: &docs.TextRun{
							Content: ", testuser2@hashicorp.com\n",
							TextStyle: &docs.TextStyle{
								Bold: true,
								FontSize: &docs.Dimension{
									Magnitude: 8,
									Unit:      "PT",
								},
							},
						},
					},
				},
			},
			[]string{"testuser1@hashicorp.com", "testuser2@hashicorp.com"},
		},
		{
			"One smart chip person contributor",
			"Contributor",
			&docs.Paragraph{
				Elements: []*docs.ParagraphElement{
					{
						EndIndex:   214,
						StartIndex: 202,
						TextRun: &docs.TextRun{
							Content: "Contributors",
							TextStyle: &docs.TextStyle{
								Bold: true,
								FontSize: &docs.Dimension{
									Magnitude: 8,
									Unit:      "PT",
								},
							},
						},
					},
					{
						EndIndex:   216,
						StartIndex: 214,
						TextRun: &docs.TextRun{
							Content: ": ",
							TextStyle: &docs.TextStyle{
								Bold: true,
								FontSize: &docs.Dimension{
									Magnitude: 8,
									Unit:      "PT",
								},
							},
						},
					},
					{
						EndIndex:   217,
						StartIndex: 216,
						Person: &docs.Person{
							PersonId: "some ID",
							PersonProperties: &docs.PersonProperties{
								Email: "testuser@hashicorp.com",
								Name:  "Test User",
							},
							TextStyle: &docs.TextStyle{
								FontSize: &docs.Dimension{
									Magnitude: 8,
									Unit:      "PT",
								},
							},
						},
					},
					{
						EndIndex:   218,
						StartIndex: 217,
						TextRun: &docs.TextRun{
							Content: "\n",
							TextStyle: &docs.TextStyle{
								Bold: true,
								FontSize: &docs.Dimension{
									Magnitude: 8,
									Unit:      "PT",
								},
							},
						},
					},
				},
			},
			[]string{"testuser@hashicorp.com"},
		},
		{
			"Two smart chip person contributors",
			"Contributor",
			&docs.Paragraph{
				Elements: []*docs.ParagraphElement{
					{
						EndIndex:   214,
						StartIndex: 202,
						TextRun: &docs.TextRun{
							Content: "Contributors",
							TextStyle: &docs.TextStyle{
								Bold: true,
								FontSize: &docs.Dimension{
									Magnitude: 8,
									Unit:      "PT",
								},
							},
						},
					},
					{
						EndIndex:   216,
						StartIndex: 214,
						TextRun: &docs.TextRun{
							Content: ": ",
							TextStyle: &docs.TextStyle{
								Bold: true,
								FontSize: &docs.Dimension{
									Magnitude: 8,
									Unit:      "PT",
								},
							},
						},
					},
					{
						EndIndex:   217,
						StartIndex: 216,
						Person: &docs.Person{
							PersonId: "some ID",
							PersonProperties: &docs.PersonProperties{
								Email: "testuser1@hashicorp.com",
								Name:  "Test User 1",
							},
							TextStyle: &docs.TextStyle{
								FontSize: &docs.Dimension{
									Magnitude: 8,
									Unit:      "PT",
								},
							},
						},
					},
					{
						EndIndex:   219,
						StartIndex: 217,
						TextRun: &docs.TextRun{
							Content: ", ",
							TextStyle: &docs.TextStyle{
								Bold: true,
								FontSize: &docs.Dimension{
									Magnitude: 8,
									Unit:      "PT",
								},
							},
						},
					},
					{
						EndIndex:   220,
						StartIndex: 219,
						Person: &docs.Person{
							PersonId: "some ID",
							PersonProperties: &docs.PersonProperties{
								Email: "testuser2@hashicorp.com",
								Name:  "Test User 2",
							},
							TextStyle: &docs.TextStyle{
								FontSize: &docs.Dimension{
									Magnitude: 8,
									Unit:      "PT",
								},
							},
						},
					},
					{
						EndIndex:   221,
						StartIndex: 220,
						TextRun: &docs.TextRun{
							Content: "\n",
							TextStyle: &docs.TextStyle{
								Bold: true,
								FontSize: &docs.Dimension{
									Magnitude: 8,
									Unit:      "PT",
								},
							},
						},
					},
				},
			},
			[]string{"testuser1@hashicorp.com", "testuser2@hashicorp.com"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.testName, func(t *testing.T) {
			assert := assert.New(t)

			got := parseParagraphWithEmails(tt.label, tt.para)
			assert.Equal(tt.want, got)
		})
	}
}
