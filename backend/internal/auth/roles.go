package auth

type Role string

const (
	RoleCustomer Role = "CUSTOMER"
	RoleRider    Role = "RIDER"
	RoleAdmin    Role = "ADMIN"
	RoleSupport  Role = "SUPPORT"
)
