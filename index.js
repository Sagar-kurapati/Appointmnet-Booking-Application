// backend/index.js

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');


const app = express();
const port = 5000;

const jwt = require('jsonwebtoken');
const SECRET_KEY = 'Business@2024'; 

// Middleware
app.use(cors({ origin: 'http://localhost:3000' })); // Adjust according to the frontend origin
app.use(express.json());

// MySQL connection credentials
const db = mysql.createConnection({
  host: '217.79.189.199',       // Replace with your database host
  user: 'crm_admin',            // MySQL user
  password: 'Business@2024',    // Your MySQL password
  database: 'crm_myapp'         // Your MySQL database name
});

// Test MySQL connection by querying the database
db.query('SELECT 1', (err, results) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// Routes

// Get all users
app.get('/api/users', (req, res) => {
  db.query('SELECT * FROM users', (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server Error');
    }
    res.json(results); // Return users as JSON
  });
});


// Get all businesses
app.get('/api/businesses', (req, res) => {
    db.query('SELECT * FROM businesses', (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Server Error');
      }
      res.json(results); // Return users as JSON
    });
  });


// Get Exact username row
// Search for a user by username
app.get('/api/users/search', (req, res) => {
    const { username, password } = req.query;  // Extract 'username' and 'password' query parameters
  
    if (!username) {
      return res.status(400).send('Username and password are required');
    }
  
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) {
          console.error(err);
          return res.status(500).send('Server Error');
        }
    
        if (results.length === 0) {
          return res.status(404).send('No user found with that username');
        }
    
        // Get the user's hashed password from the database
        const user = results[0];
    
        // Compare the provided password with the hashed password stored in the database
        bcrypt.compare(password, user.password, (err, isMatch) => {
          if (err) {
            console.error(err);
            return res.status(500).send('Error comparing passwords');
          }
    
          if (!isMatch) {
            return res.status(401).send('Invalid password');
          }

          
          const token = jwt.sign({ id: user.business_id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
          // Passwords match, return the user details (excluding the password)
          const { password, ...userWithoutPassword } = user;
          res.json({ userId: user.business_id, token });
        });
      });
  });
  
// insert api 
app.post('/api/users/create', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('Username and password are required');
  }

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server Error');
    }

    // Insert the username and hashed password into the database
    const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
    db.query(query, [username, hashedPassword], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Server Error');
      }
      res.status(201).json({ message: 'User created successfully', userId: results.insertId });
    });
  });
});

// add business 
app.post('/api/businesses/createbusiness', (req, res) => {
  const { businessName, email, businessType, ownerName, phone } = req.body;

  if (!businessName || !email || !businessType || !ownerName || !phone) {
    return res.status(400).send('All fields are required');
  }

  // Insert the business into the database
  const query = 'INSERT INTO businesses (name, email, type, owner_name, phone) VALUES (?, ?, ?, ?, ?)';
  db.query(query, [businessName, email, businessType, ownerName, phone], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }

    res.status(201).json({ message: 'Business registered successfully' });
  });
});

// Endpoint to fetch business details
app.get('/api/businesses/:id', (req, res) => {
    const { id } = req.params;
  
    // Query the database for the business by ID
    const query = 'SELECT * FROM businesses WHERE id = ?';
  
    db.query(query, [id], (err, results) => {
      if (err) {
        console.error('Error fetching business:', err);
        return res.status(500).send('Server error');
      }
  
      if (results.length === 0) {
        return res.status(404).json({ message: 'Business not found' });
      }
  
      // Return the business details
      res.json(results[0]);
    });
});


// Endpoint to fetch business details for admin (business owner)
app.get('/api/:id', (req, res) => {
  const { id } = req.params;

  // Ensure ID is a number to prevent SQL injection or invalid queries
  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid ID format' });
  }

  // Query the database for the business by ID
  const query = 'SELECT * FROM businesses WHERE id = ?';

  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error fetching business:', err);
      return res.status(500).send('Server error');
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Business was not found' });
    }

    // Return the business details
    res.json(results[0]);
  });
});

// Employee Details API
// Fetch employee details based on business ID and employee name
app.get('/api/businesses/:businessId/employees/:employeeName', (req, res) => {
  const { businessId, employeeName } = req.params;

  // Query to fetch employee details
  const employeeQuery = `
    SELECT * FROM employees WHERE businessId = ? AND name = ?
  `;

  db.query(employeeQuery, [businessId, employeeName], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error while fetching employee details');
    }

    if (results.length === 0) {
      return res.status(404).send('Employee not found');
    }

    const employee = results[0];

    // Extract service IDs from the services column (assuming it's a comma-separated string like "3,2,1")
    const serviceIds = employee.services ? employee.services.split(',') : [];

    // Add the service IDs to the employee object
    employee.services = serviceIds;

    res.json(employee);
  });
});

// Service Details API
app.get('/api/services/:serviceId', (req, res) => {
  const { serviceId } = req.params;

  // Query to fetch service details by ID
  const serviceQuery = `
    SELECT * FROM business_services WHERE id = ?
  `;

  db.query(serviceQuery, [serviceId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error while fetching service details');
    }

    if (results.length === 0) {
      return res.status(404).send('Service not found');
    }

    const service = results[0];
    res.json(service); // Return the service details
  });
});


// Fetch services for a specific business
app.get('/api/businesses/:id/services', (req, res) => {
    const { id } = req.params;
  
    // Query to fetch services for the given business ID
    const query = 'SELECT id,service_name, price FROM business_services WHERE business_id = ?';
  
    db.query(query, [id], (err, results) => {
      if (err) {
        console.error('Error fetching services:', err);
        return res.status(500).send('Server error');
      }
  
      res.json(results);
    });
  });


  //fetch sevices accroding employee
  app.get('/api/services', (req, res) => {
    const { ids } = req.query; // Get the comma-separated list of service IDs
    const serviceIds = ids.split(',');
  
    // Query the database to fetch services with the given IDs
    const query = 'SELECT * FROM business_services WHERE id IN (?)';
    db.query(query, [serviceIds], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Failed to fetch services');
      }
      res.json(results); // Return the service details as a JSON response
    });
  });
  

  // add services 
  app.post('/api/businesses/:id/addservice', (req, res) => {
    const { id: businessId } = req.params; // Extract businessId from the URL
    const { serviceName, price } = req.body;
  
    if (!serviceName || !price || !businessId) {
      return res.status(400).send('All fields are required');
    }
  
    const query = 'INSERT INTO business_services (business_id, service_name, price) VALUES (?, ?, ?)';
    db.query(query, [businessId, serviceName, price], (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Server error while adding service');
      }
  
      res.status(201).json({ message: 'Service added successfully' });
    });
  });
  
   //add employee
   app.post('/api/businesses/:id/addemployee', (req, res) => {
    const { id: businessId } = req.params;
    const { name, position, salary, services } = req.body;

    if (!name || !position || !salary || !businessId || !services || !services.length) {
        return res.status(400).send('All fields are required, including at least one service');
    }

    // Convert services array to a comma-separated string
    const servicesString = services.join(',');

    // Insert the employee into the employees table
    const employeeQuery = `
        INSERT INTO employees (name, position, salary, businessId, services) 
        VALUES (?, ?, ?, ?, ?)`;

    db.query(employeeQuery, [name, position, salary, businessId, servicesString], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error while adding employee');
        }

        res.status(201).json({ message: 'Employee added successfully' });
    });
  });

  


  // Fetch employees for a specific business
app.get('/api/businesses/:id/employees', (req, res) => {
  const { id } = req.params;

  // Query to fetch employees for the given business ID
  const query = 'SELECT id, name, position, salary FROM employees WHERE businessId = ?';

  db.query(query, [id], (err, results) => {
      if (err) {
          console.error('Error fetching employees:', err);
          return res.status(500).send('Server error');
      }

      res.json(results);
  });
});


//emplyoee by name
app.get('/api/businesses/:id/employees/:name', (req, res) => {
  const { id, name } = req.params;

  // Query to fetch employee details for the given business ID and employee name
  const query = `
    SELECT id, name, position, salary, businessId
    FROM employees 
    WHERE businessId = ? AND name = ?`;

  db.query(query, [id, name], (err, results) => {
    if (err) {
      console.error('Error fetching employee details:', err);
      return res.status(500).send('Server error');
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json(results[0]); // Return the employee details
  });
});


// cal api
  app.get('/api/businesses/:id/cal', (req, res) => {
    const { id } = req.params;
  
    // Query to fetch services for the given business ID
    const query = 'SELECT service_name, price FROM business_services WHERE business_id = ?';
  
    db.query(query, [id], (err, results) => {
      if (err) {
        console.error('Error fetching services:', err);
        return res.status(500).send('Server error');
      }
  
      res.json(results);
    });
  });
  

// Fetch existing appointments for a business
app.get('/api/businesses/:id/appointments', (req, res) => {
  const { id } = req.params;

  // Query to fetch appointments for the given business ID
  const query = `
    SELECT 
      a.id AS appointment_id, 
      a.start_time AS start, 
      a.end_time AS end, 
      s.service_name AS service
    FROM appointments a
    JOIN business_services s ON a.service_id = s.id
    WHERE s.business_id = ?
  `;

  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error fetching appointments:', err);
      return res.status(500).send('Server error');
    }

    res.json(results);
  });
});

// Add a new appointment for a business
// app.post('/api/businesses/:id/appointments', (req, res) => {
//   const { id } = req.params; // Business ID
//   const { service, start, end } = req.body; // Service name, start time, and end time

//   if (!service || !start || !end) {
//     return res.status(400).send('Service, start time, and end time are required');
//   }

//   // Find the service ID for the given service name and business ID
//   const serviceQuery = `
//     SELECT id FROM business_services 
//     WHERE service_name = ? AND business_id = ?
//   `;

//   db.query(serviceQuery, [service, id], (err, results) => {
//     if (err) {
//       console.error('Error finding service ID:', err);
//       return res.status(500).send('Server error');
//     }

//     if (results.length === 0) {
//       return res.status(404).send('Service not found for this business');
//     }

//     const serviceId = results[0].id;

//     // Insert the appointment into the database
//     const appointmentQuery = `
//       INSERT INTO appointments (service_id, start_time, end_time) 
//       VALUES (?, ?, ?)
//     `;

//     db.query(appointmentQuery, [serviceId, start, end], (err, results) => {
//       if (err) {
//         console.error('Error creating appointment:', err);
//         return res.status(500).send('Server error');
//       }

//       res.status(201).json({ message: 'Appointment created successfully', appointmentId: results.insertId });
//     });
//   });
// });

app.get('/api/businesses/:id/appointments', (req, res) => {
  const { id } = req.params;

  // Query to fetch appointments for the given business ID
  const query = `
    SELECT 
      a.id AS appointment_id, 
      a.start_time AS start, 
      a.end_time AS end, 
      s.service_name AS service
    FROM appointments a
    JOIN business_services s ON a.service_id = s.id
    WHERE s.business_id = ?
  `;

  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error fetching appointments:', err);
      return res.status(500).send('Server error');
    }

    res.json(results); // Return the appointments as JSON
  });
});

//appointments post api 
const moment = require('moment');

app.post('/api/businesses/:id/appointments', (req, res) => {
  const { id } = req.params; // Extract the business ID from the URL
  const { service_name, start_time, end_time } = req.body; // Extract appointment data from request body

  // Check if the required fields are provided
  if (!service_name || !start_time || !end_time) {
    return res.status(400).send('Missing required fields');
  }

  // Convert start_time and end_time to 'YYYY-MM-DD HH:MM:SS' format
  const formattedStartTime = moment(start_time).format('YYYY-MM-DD HH:mm:ss');
  const formattedEndTime = moment(end_time).format('YYYY-MM-DD HH:mm:ss');

  // Query to find the service_id based on the service_name and business_id
  const getServiceQuery = `
    SELECT id FROM business_services WHERE business_id = ? AND service_name = ?
  `;

  // First, we need to find the service ID based on the service_name and business ID
  db.query(getServiceQuery, [id, service_name], (err, results) => {
    if (err) {
      console.error('Error fetching service:', err.message || err);
      return res.status(500).send('Server error');
    }

    if (results.length === 0) {
      return res.status(404).send('Service not found');
    }

    const service_id = results[0].id;

    // Now, insert the new appointment using the service_id
    const insertAppointmentQuery = `
      INSERT INTO appointments (service_id, start_time, end_time) 
      VALUES (?, ?, ?)
    `;

    // Insert the appointment into the database
    db.query(insertAppointmentQuery, [service_id, formattedStartTime, formattedEndTime], (err, results) => {
      if (err) {
        console.error('Error inserting appointment:', err.message || err);
        return res.status(500).send('Server error');
      }

      res.status(201).send({
        message: 'Appointment created successfully',
        appointmentId: results.insertId,
      });
    });
  });
});


const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Extract token from "Bearer <token>"

  if (!token) {
    return res.status(403).json({ message: 'No token provided.' });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Unauthorized. Invalid token.' });
    }
    req.userId = decoded.id; // Attach user info to request object
    next();
  });
};

// Endpoint to add an employee
app.post('/api/employees', verifyToken, (req, res) => {
  const { name, position, salary, businessId } = req.body;

  // Validate input
  if (!name || !position || !salary || !businessId) {
    return res.status(400).json({ message: 'All fields, including businessId, are required.' });
  }

  // Insert employee into database
  const query = 'INSERT INTO employees (name, position, salary, businessId) VALUES (?, ?, ?, ?)';
  db.query(query, [name, position, salary, businessId], (err, result) => {
    if (err) {
      console.error('Error inserting employee:', err);
      return res.status(500).json({ message: 'Server error. Unable to add employee.' });
    }
    res.status(201).json({ message: 'Employee added successfully!', employeeId: result.insertId });
  });
});



// API to fetch booked slots for a specific date
app.get('/api/appointments', (req, res) => {
  const { date } = req.query; // The date parameter passed from the frontend

  // Validate if the date is provided and is in the correct format
  if (!date) {
    return res.status(400).json({ error: 'Date parameter is required' });
  }

  // Format the date to match the database format
  const formattedDate = moment(date).format('YYYY-MM-DD'); // e.g., "2024-12-09"

  // SQL query to fetch appointments for the selected date
  const query = `
    SELECT * FROM appointments
    WHERE DATE(start_time) = ?;
  `;

  db.query(query, [formattedDate], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error fetching booked slots' });
    }

    res.json(results); // Return booked slots (appointments)
  });
});

// API to book an appointment
app.post('/api/bookappointments/:id/:name/:serviceId', (req, res) => {
  const { id, name, serviceId } = req.params; // Get business ID, name, and service ID from URL
  const { date, startTime, endTime } = req.body;

  // Logic to check if the slot is already booked
  const query = `
    INSERT INTO appointments (businessId, name, service_id, start_time, end_time)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(query, [id, name, serviceId, startTime, endTime], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error booking appointment');
    }

    res.status(200).send('Appointment booked successfully');
  });
});

// API to fetch booked slots
app.get('/api/bookedslots/:id/:name/:serviceId', (req, res) => {
  const { id, name, serviceId } = req.params;
  const { date } = req.query;

  if (!date) {
    return res.status(400).send('Date parameter is required.');
  }

  const query = `
    SELECT start_time, end_time 
    FROM appointments 
    WHERE businessId = ? AND name = ? AND service_id = ? AND DATE(start_time) = ?
  `;

  db.query(query, [id, name, serviceId, date], (err, results) => {
    if (err) {
      console.error('Error fetching booked slots:', err);
      return res.status(500).send('Failed to fetch booked slots.');
    }

    res.status(200).json(results);
  });
});


// API to fetch appointments for a given business ID and name
app.get('/api/fetchbook/:id/:name/cal', (req, res) => {
  const { id, name } = req.params;
  console.log(id, name);

  // SQL query to fetch appointments based on businessId and name
  const query = `
    SELECT id, service_id, start_time, end_time
    FROM appointments
    WHERE businessId = ? 
      AND name = ?;
  `;

  db.query(query, [id, name], (err, results) => {
    if (err) {
      console.error('Error fetching appointments:', err);
      return res.status(500).send('Server error');
    }

    // If no appointments are found, return an empty array
    if (results.length === 0) {
      return res.status(404).json([]);
    }

    // Send the filtered appointments as the response
    res.json(results);
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
