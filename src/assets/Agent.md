If the sidebar menubutton for Users is clicked, the height og the <li> will expand to accomodate 2 new list of button options
Format:
<ul>
<li><button><img></button></li>
<li><button><img></button></li>
</ul>

1. Farm Owners
2. Farmers

Create a file "AdminFarmOwners.jsx". 

If the "FarmOwners" is clicked, the AdminPendingFarmOwners will be rendered to Admin.jsx as a new section  under AdminHeader.

In the AdminFarmOwners.jsx, there should be a div "admin-fo-header" which contains a Title "Farm Owner List", a search bar, a select input for:Pending, Approved, Rejected and a filter feature

Create another div for the table after it.
This is the current table we have at sql workbench "farmadmin_registrations"

registration_id
email
password_hash
first_name
surname
middle_initial
name_extension
mobile_number
personal_email
house_lot_block
street
barangay
municipality_city
province
region
zip_code
status
submitted_at
reviewed_at
reviewed_by
rejection_reason

On the table show these columns:
-status
-registration_id
-email
-first_name
-surname
-middle_initial
-name_extension
-mobile_number
-personal_email

Make the registration_id a clickable link /admin/{registration_id}, which showcase the specific user

in this new page "AdminFarmOwnerDetail.jsx", show the same header, sidebar.
-Create a tool that displays all the user info as well as a gallery style viewable uploaded documents

These is the "farmadmin_registration_documents" table that is related to the "farmadmin_registrations"

document_id
registration_id
id_type
id_front_path
id_back_path
selfie_path
verification_status
verified_at
verified_by
uploaded_at

As a currently logged-in admin, I want to be able to view the submitted documents, the user info and an easy action button to either Approve or Reject the registration.

You may check the backend folder if you want to verify the current IntelliJ springboot that is running. Give me instruction to IntelliJ copil;ot on how to work with what you made after.

Once approved, send these data to the "users" table
1. global_id (this is auto increment no need to change)
2. user_name = firstname.middleinitial.surname@mannalon.com (Mandatory mannalon.com)
3. user_password = temporary auto generated password
4. user_role = "Farm-Admin"
5. user_id = starts from 100000000 (auto increments to +1) (you can tell me what to do on sql if I need to edit something on the structure of the field)
6. user_status = active

For later purpose, we will send this user_name and password to their personal email, which they will use to login to the FarmAdmin Portal (I haven'tmade this yet so DOn't worry about it for now)



