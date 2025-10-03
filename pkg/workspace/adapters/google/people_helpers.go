package google

import (
	"fmt"

	"github.com/cenkalti/backoff/v4"
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
