Assignment: Blog Application REST API Development
Objective
Develop a REST API for a Blog Management Application with three access levels:

Admin
User
Guest
The application must support authentication, user management, blog management, authorization, validation, and public blog searching.

1. Database Setup
Create a database named:


blogdb
Create two tables:

users
ColumnDescription
id	Primary key
firstname	User's first name
lastname	User's last name
email	User's unique email
password	Hashed password
isActive	Default: true
role	Default: user
createAt	Record creation time
updateAt	Record update time
For an admin user, manually update:


role = admin
blogs
ColumnDescription
id	Primary key
userId	ID of the blog owner
blogTitle	Blog title
blog	Blog content
category	Blog category
createAt	Record creation time
updateAt	Record update time
blogs.userId must reference users.id.

2. Admin Flow
An admin is also a user whose role is admin.

Admin Login

POST /api/auth/login
Request:


{
  "email": "admin@example.com",
  "password": "password123"
}
Only an active admin should be able to log in successfully.

Get All Users

GET /api/users
Requirements:

Authentication required.
Admin access only.
Return all registered users.
Password must never be returned.
Get User by ID

GET /api/users/:id
Requirements:

Authentication required.
Admin access only.
Return 404 if the user does not exist.
Activate or Deactivate User

PATCH /api/users/:id/status
Request:


{
  "isActive": false
}
Requirements:

Admin access only.
Admin can activate or deactivate a user.
A deactivated user must not be able to log in.
Admin Blog Permissions
Admin can use the same blog APIs as a normal user.

Admin can also:

Update any user's blog.
Delete any user's blog.

PUT /api/blogs/update/:id
DELETE /api/blogs/:id
3. User Flow
A normal user should be able to register, log in, manage their profile and password, and manage their own blogs.

Register User

POST /api/auth/register
Request:


{
  "firstname": "John",
  "lastname": "Doe",
  "email": "john@example.com",
  "password": "password123"
}
Requirements:

Email must be unique.
Password must be hashed before storing.
Default role must be user.
Default isActive must be true.
A user must not be able to assign themselves the admin role during registration.
User Login

POST /api/auth/login
Request:


{
  "email": "john@example.com",
  "password": "password123"
}
Requirements:

Validate email and password.
User must be active.
Return an authentication token after successful login.
Invalid credentials must return an appropriate error.
Get Own Profile

GET /api/users/profile
Requirements:

Authentication required.
Return information about the logged-in user.
Password must not be returned.
Update Own Profile

PUT /api/users/profile/update
Example:


{
  "firstname": "John",
  "lastname": "Smith"
}
A normal user must not be allowed to update:


role
isActive
Update Password

PATCH /api/users/password
The new password will be provided directly through the request payload.

Example:


{
  "password": "newPassword123"
}
Requirements:

Authentication required.
Validate the new password.
Hash the password before saving it.
Plain-text password must never be stored.
4. Blog Flow
Create Blog

POST /api/blogs/create
Authentication required.

Request:


{
  "blogTitle": "Introduction to API Testing",
  "blog": "This article explains the fundamentals of API testing...",
  "category": "Testing"
}
Requirements:

userId must be taken from the authenticated user.
The client must not provide userId.
Required fields must be validated.
Update Blog

PUT /api/blogs/update/:id
Request:


{
  "blogTitle": "Updated Blog Title",
  "blog": "Updated blog content",
  "category": "Automation"
}
Requirements:

Authentication required.
A normal user can update only their own blog.
An admin can update any user's blog.
Delete Blog

DELETE /api/blogs/:id
Requirements:

Authentication required.
A normal user can delete only their own blog.
An admin can delete any user's blog.
5. Guest Flow
A guest is a user who is not authenticated.

Guests should be able to access public blog APIs.

Get All Blogs

GET /api/blogs
No authentication required.

The response should contain blog and author information.

Example:


{
  "id": 1,
  "blogTitle": "Introduction to API Testing",
  "blog": "This article explains...",
  "category": "Testing",
  "author": {
    "id": 5,
    "firstname": "John",
    "lastname": "Doe"
  }
}
Passwords or other sensitive user information must never be exposed.

Get Blog by ID

GET /api/blogs/:id
No authentication required.

Requirements:

Return the requested blog.
Return 404 if the blog does not exist.
Search Blog by Title

GET /api/blogs?title=playwright
No authentication required.

The API must search blogs based on blogTitle.

The search should support partial title matching.

Filter Blogs by Category

GET /api/blogs?category=Testing
No authentication required.

Return blogs belonging to the requested category.

Both filters can also be used together:


GET /api/blogs?title=playwright&category=Testing
6. Authentication and Authorization Rules
Action | Guest | User | Admin
Register	✅	✅	✅
Login	✅	✅	✅
View all blogs	✅	✅	✅
View blog by ID	✅	✅	✅
Search blog by title	✅	✅	✅
Filter blog by category	✅	✅	✅
Create blog	❌	✅	✅
Update own blog	❌	✅	✅
Update another user's blog	❌	❌	✅
Delete own blog	❌	✅	✅
Delete another user's blog	❌	❌	✅
View own profile	❌	✅	✅
Update own profile	❌	✅	✅
Update own password	❌	✅	✅
View all users	❌	❌	✅
View user by ID	❌	❌	✅
Activate/deactivate users	❌	❌	✅
7. Validation Requirements
Implement appropriate validation for the APIs.

At minimum:

Required fields cannot be empty.
Email must have a valid format.
Email must be unique.
Password must have a reasonable minimum length.
Blog title cannot be empty.
Blog content cannot be empty.
Invalid IDs must return appropriate responses.
Missing users or blogs must return 404.
Unauthorized requests must return 401.
Forbidden operations must return 403.
Use meaningful error responses.

Example:


{
  "message": "You are not authorized to update this blog."
}
8. Security Requirements
The application must:

Hash passwords before storing them.
Never return passwords through APIs.
Use token-based authentication.
Validate authentication for protected endpoints.
Validate APIs with user-specific roles.
9. HTTP Status Codes
Use appropriate HTTP status codes.


200 OK
201 Created
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
500 Internal Server Error
Examples:

Successful registration → 201
Successful blog creation → 201
Invalid input → 400
Missing authentication → 401
Unauthorized operation → 403
Blog/user not found → 404
Duplicate email → 409
