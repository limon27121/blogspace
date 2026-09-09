Submission Procedure
Must keep node_modules and .env in .gitignore.
The project code must be properly organized.
Create a Postman collection for all developed APIs.
Generate Postman documentation for the APIs.
Create a proper README.md with project details and add the Postman documentation link.
The repository must be publicly accessible.
Ensure the following endpoints are included in the Postman collection:
#Method | Endpoint | Access | Purpose
1	POST	/api/auth/register	Public	Register a new user
2	POST	/api/auth/login	Public	Login and receive authentication token
3	GET	/api/users	Admin	Get all users
4	GET	/api/users/:id	Admin	Get a specific user
5	PATCH	/api/users/:id/status	Admin	Activate/deactivate a user
6	GET	/api/users/profile	User/Admin	Get own profile
7	PUT	/api/users/profile/update	User/Admin	Update own profile
8	PATCH	/api/users/password	User/Admin	Update own password
9	POST	/api/blogs/create	User/Admin	Create a blog
10	GET	/api/blogs	Public	Get blog list/search/filter
11	GET	/api/blogs/:id	Public	Get a specific blog
12	PUT	/api/blogs/update/:id	User/Admin	Update a blog
13	DELETE	/api/blogs/delete/:id	User/Admin	Delete a blog
