package google

import (
	"fmt"

	"github.com/cenkalti/backoff/v4"
	"github.com/hashicorp-forge/hermes/pkg/workspace"
	"google.golang.org/api/people/v1"
)

// SearchPeople searches the Google People API.
func (s *Service) SearchPeople(
	query, readMask string) ([]*people.Person, error) {

	var (
		call          *people.PeopleSearchDirectoryPeopleCall
		err           error
		nextPageToken string
		ret           []*people.Person
		resp          *people.SearchDirectoryPeopleResponse
	)

	op := func() error {
		resp, err = call.Do()
		if err != nil {
			return fmt.Errorf("error searching people directory: %w", err)
		}

		return nil
	}

	for {
		call = s.People.SearchDirectoryPeople().Query(query).
			ReadMask(readMask).
			Sources("DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE")

		if nextPageToken != "" {
			call = call.PageToken(nextPageToken)
		}

		boErr := backoff.RetryNotify(op, defaultBackoff(), backoffNotify)
		if boErr != nil {
			return nil, boErr
		}

		ret = append(ret, resp.People...)

		nextPageToken = resp.NextPageToken
		if nextPageToken == "" {
			break
		}
	}

	return ret, nil
}

// SearchDirectory performs advanced directory search with query strings, field selection, and source filtering.
func (s *Service) SearchDirectory(opts workspace.PeopleSearchOptions) ([]*people.Person, error) {
	var (
		call          *people.PeopleSearchDirectoryPeopleCall
		err           error
		nextPageToken string
		ret           []*people.Person
		resp          *people.SearchDirectoryPeopleResponse
		maxResults    int64
	)

	// Build the base call
	call = s.People.SearchDirectoryPeople().Query(opts.Query)

	// Set read mask (fields to return)
	if len(opts.Fields) > 0 {
		readMask := ""
		for i, field := range opts.Fields {
			if i > 0 {
				readMask += ","
			}
			readMask += field
		}
		call = call.ReadMask(readMask)
	}

	// Set sources (default to DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE)
	if len(opts.Sources) > 0 {
		for _, source := range opts.Sources {
			call = call.Sources(source)
		}
	} else {
		call = call.Sources("DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE")
	}

	// Set max results if specified
	if opts.MaxResults > 0 {
		maxResults = opts.MaxResults
	}

	// Handle initial page token
	if opts.PageToken != "" {
		nextPageToken = opts.PageToken
	}

	op := func() error {
		resp, err = call.Do()
		if err != nil {
			return fmt.Errorf("error searching people directory: %w", err)
		}
		return nil
	}

	for {
		if nextPageToken != "" {
			call = call.PageToken(nextPageToken)
		}

		boErr := backoff.RetryNotify(op, defaultBackoff(), backoffNotify)
		if boErr != nil {
			return nil, boErr
		}

		ret = append(ret, resp.People...)

		// Stop if we've reached the max results
		if maxResults > 0 && int64(len(ret)) >= maxResults {
			ret = ret[:maxResults]
			break
		}

		nextPageToken = resp.NextPageToken
		if nextPageToken == "" {
			break
		}
	}

	return ret, nil
}
