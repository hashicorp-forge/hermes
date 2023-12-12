package jira

// GET /rest/api/3/issue/{issueIdOrKey}
type APIResponseIssueGet struct {
	Fields APIResponseIssueGetFields `json:"fields"`
	Key    string                    `json:"key"`
}
type APIResponseIssueGetFields struct {
	Assignee  APIResponseIssueGetFieldsAssignee  `json:"assignee"`
	IssueType APIResponseIssueGetFieldsIssueType `json:"issuetype"`
	Priority  APIResponseIssueGetFieldsPriority  `json:"priority"`
	Project   APIResponseIssueGetFieldsPriority  `json:"project"`
	Reporter  APIResponseIssueGetFieldsReporter  `json:"reporter"`
	Status    APIResponseIssueGetFieldsStatus    `json:"status"`
	Summary   string                             `json:"summary"`
}
type APIResponseIssueGetFieldsAssignee struct {
	AvatarURLs   APIResponseIssueGetFieldsReporterAvatarURLs `json:"avatarUrls"`
	DisplayName  string                                      `json:"displayName"`
	EmailAddress string                                      `json:"emailAddress"`
}
type APIResponseIssueGetFieldsIssueType struct {
	IconURL string `json:"iconUrl"`
	Name    string `json:"name"`
}
type APIResponseIssueGetFieldsPriority struct {
	Name    string `json:"name"`
	IconURL string `json:"iconUrl"`
}
type APIResponseIssueGetFieldsProject struct {
	Name string `json:"name"`
}
type APIResponseIssueGetFieldsReporter struct {
	AvatarURLs   APIResponseIssueGetFieldsReporterAvatarURLs `json:"avatarUrls"`
	DisplayName  string                                      `json:"displayName"`
	EmailAddress string                                      `json:"emailAddress"`
}
type APIResponseIssueGetFieldsReporterAvatarURLs struct {
	FourtyEightByFourtyEight string `json:"48x48"`
}
type APIResponseIssueGetFieldsStatus struct {
	Name string `json:"name"`
}

// GET /rest/api/3/issue/picker
type APIResponseIssuePickerGet struct {
	Sections []APIResponseIssuePickerGetSection `json:"sections"`
}
type APIResponseIssuePickerGetSection struct {
	ID     string                                  `json:"id"`
	Issues []APIResponseIssuePickerGetSectionIssue `json:"issues"`
	Label  string                                  `json:"label"`
}
type APIResponseIssuePickerGetSectionIssue struct {
	ID          int    `json:"id"`
	Key         string `json:"key"`
	Img         string `json:"img"`
	SummaryText string `json:"summaryText"`
}
