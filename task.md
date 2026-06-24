The application should support a role-based hierarchy consisting of Admin, Manager, and Employee roles. The Admin should be able to create departments, roles, and employees, as well as assign employees to managers. Managers should only be able to view and manage employees assigned to them, while employees should have access only to their own data.

Employees should be able to log in and mark their attendance. Upon check-in, the system should capture the employee's current location (latitude and longitude) and start a live working timer. The timer should continue accurately even after page refreshes. When the employee checks out, the system should again capture the current location, stop the timer, and calculate total working hours for the day.

The system should maintain daily attendance records, including check-in time, check-out time, working hours, and attendance locations. Employees should also be able to apply for different types of leave, including Casual Leave, Sick Leave, Half-Day Leave, Early Leave, Work From Home, and Field Visits. Managers and Admins should be able to approve or reject leave requests.

Managers should have access to attendance records and leave requests for employees reporting to them, while the Admin should have access to organization-wide attendance, employee management, leave management, and reporting. The Admin dashboard should provide insights such as total employees, present employees, absent employees, employees on leave, and attendance statistics.

reade the above requirment carefully 
i want to manage this task by the advance feature of node in backend and frontend in react 

a clean uI for the application and clean mvc pattenr for node and security feature more for api read the requirment and provide the plan what is you plan to complete this projetc tell me in detail 

note plane first and model for then we start the word not do the code start first 

client/src/
├── api/           axios.js + 6 API modules (auth, attendance, leave, user, dept, report)
├── store/
│   ├── index.js
│   └── slices/    auth, attendance, leave
├── hooks/         useAuth.js, useLiveTimer.js, useSocket.js
├── router/        index.jsx, ProtectedRoute.jsx
├── layouts/       AuthLayout.jsx, DashboardLayout.jsx
├── components/
│   ├── ui/        Button, Input/Select/Textarea, Modal, Badge, Card, Spinner, Pagination
│   ├── layout/    Sidebar.jsx, Header.jsx
│   ├── attendance/ CheckInOutCard.jsx, LiveTimer.jsx
│   └── leave/     LeaveBalanceCard.jsx, ApplyLeaveModal.jsx
├── pages/
│   ├── auth/      LoginPage.jsx
│   ├── dashboard/ AdminDashboard, ManagerDashboard, EmployeeDashboard
│   ├── attendance/ AttendancePage, ManageAttendancePage
│   ├── leave/     MyLeavesPage, ManageLeavesPage
│   ├── users/     UsersPage.jsx
│   ├── departments/ DepartmentsPage.jsx
│   ├── reports/   ReportsPage.jsx
│   └── profile/   ProfilePage.jsx
├── utils/         constants.js, formatters.js
├── App.jsx, main.jsx, index.css


Name	Email	Role	Password
System Admin	admin@worktrack.com	ADMIN	Admin@1234
Super Admin	admin@company.com	ADMIN	Admin@1234
Sonu Chaudhary	chaudharysonu200212@gmail.com	ADMIN	Admin@1234
Team Manager	manager@company.com	MANAGER	Manager@1234
Sonu Chaudhary	sonu.chaudhary@policyx.com	MANAGER	Manager@1234
John Employee	employee@company.com	EMPLOYEE	Employee@1234
Jane Smith	jane@company.com	EMPLOYEE	Employee@1234
Sonu Chaudhary	chaudhary123@gmail.com	EMPLOYEE	Employee@1234
