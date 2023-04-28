package googleworkspace

import (
	admin "google.golang.org/api/admin/directory/v1"
)

/*
// CreateGroup creates a Google Group.
func (s *Service) CreateGroup(
	id, name, description, email string) (*admin.Group, error) {

	g := &admin.Group{
		Description: description,
		Email:       email,
		Id:          id,
		Name:        name,
	}

	resp, err := s.Admin.Groups.Insert(g).Do()
	if err != nil {
		return nil, fmt.Errorf("error creating group: %w", err)
	}
	return resp, nil
}

// CreateTagGroup creates a Google Group for a Hermes tag.
func (s *Service) CreateTagGroup(tag string) (*admin.Group, error) {
	tag = strings.ToLower(tag)
	tagID := strings.ToLower(fmt.Sprintf("hermes-josh-tag-%s", tag))

	g, err := s.CreateGroup(
		tagID,
		tagID,
		fmt.Sprintf("Hermes tag: \"%s\"", tag),
		// TODO: make domain configurable
		fmt.Sprintf("%s@hashicorp.com", tagID),
	)
	if err != nil {
		return nil, fmt.Errorf("error creating tag group: %w", err)
	}

	return g, nil
}

// GetGroup returns a Google Group.
func (s *Service) GetGroup(groupKey string) (*admin.Group, error) {
	resp, err := s.Admin.Groups.Get(groupKey).Do()
	if err != nil {
		return nil, fmt.Errorf("error getting group: %w", err)
	}
	return resp, nil
}
*/

// GetUser gets a user.
func (s *Service) GetUser(userKey string) (*admin.User, error) {
	resp, err := s.Admin.Users.Get(userKey).
		ViewType("domain_public").
		Do()
	if err != nil {
		return nil, err
	}
	return resp, nil
}
