CREATE DATABASE IF NOT EXISTS deployly;
CREATE USER IF NOT EXISTS 'deployly'@'localhost' IDENTIFIED BY 'Deployly@123';
GRANT ALL PRIVILEGES ON deployly.* TO 'deployly'@'localhost';
FLUSH PRIVILEGES;
