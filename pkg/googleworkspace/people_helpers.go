package googleworkspace

import (
	"github.com/cenkalti/backoff/v4"
	"google.golang.org/api/people/v1"
)

// SearchPeople searches the Google People API.
func (s *Service) SearchPeople(query string) ([]*people.Person, error) {

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
			return err
		}

		return nil
	}

	for {
		call = s.People.SearchDirectoryPeople().Query(query).
			ReadMask("photos").
			Sources("DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE")

		if nextPageToken != "" {
			call = call.PageToken(nextPageToken)
		}

		boErr := backoff.Retry(op, backoff.NewExponentialBackOff())
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
