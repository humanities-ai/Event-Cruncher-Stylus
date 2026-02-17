// CREATE TABLE profiles (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     username VARCHAR(255) UNIQUE,
//     password VARCHAR(255)
// );
    
// INSERT INTO profiles (id, username, password)
//     VALUES (
//         1,
//         'admin',
//         'admin'
// );
    
// CREATE TABLE avdata (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     user_id INT NOT NULL UNIQUE,
//     who_text TEXT,
//     who_files JSON,
//     what_text TEXT,
//     what_files JSON,
//     when_text TEXT,
//     when_files JSON,
//     where_text TEXT,
//     where_files JSON,
//     why_text TEXT,
//     why_files JSON,
//     how_text TEXT,
//     how_files JSON,
//     who_file_name VARCHAR(255),
//     who_file_type VARCHAR(100),
//     what_file_name VARCHAR(255),
//     what_file_type VARCHAR(100),
//     when_file_name VARCHAR(255),
//     when_file_type VARCHAR(100),
//     where_file_name VARCHAR(255),
//     where_file_type VARCHAR(100),
//     why_file_name VARCHAR(255),
//     why_file_type VARCHAR(100),
//     how_file_name VARCHAR(255),
//     how_file_type VARCHAR(100),
//     FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
// );


// CREATE TABLE avdata_files (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     user_id INT NOT NULL,
//     face ENUM('who', 'what', 'when', 'where', 'why', 'how') NOT NULL,
//     file_data LONGBLOB NOT NULL,
//     file_name VARCHAR(255) NOT NULL,
//     file_type VARCHAR(100) NOT NULL,
//     upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//     FOREIGN KEY (user_id) REFERENCES avdata(user_id) ON DELETE CASCADE
// );



// CREATE TABLE criteria (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     who_text TEXT,
//     what_text TEXT,
//     when_text TEXT,
//     where_text TEXT,
//     why_text TEXT,
//     how_text TEXT,
//     last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
// );

// CREATE TABLE avfiles (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     user_id INT NOT NULL,
//     face ENUM('who', 'what', 'when', 'where', 'why', 'how') NOT NULL,
//     file_data LONGBLOB NOT NULL,
//     file_name VARCHAR(255) NOT NULL,
//     file_type VARCHAR(100) NOT NULL,
//     upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//     FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
// );
