<div align="center">
  <br>
  <h1>Clarity Call</h1>
  <strong>ClarityCall brings you clear call, clearer thoughts.</strong>
  <div align="center">
    <a href="https://claritycall.co">Home Page</a> |
    <a href="https://drive.google.com/file/d/12S1HUQklEy1wEmxjqk44huwuMb71qP8Z/view?usp=sharing">Video Intro</a> |
    <a href="https://www.linkedin.com/in/li-jia-teng-2561221a3/">About Me</a>
    <br>
    <br>
    <img width="500" alt="claritycall" src="https://github.com/LJT-512/ClarityCall/assets/86831309/a18bbc1c-fe17-4f7e-a544-e43e9968ec6e">
</div>
</div>
<br>

Welcome to ClarityCall, a video conferencing platform designed to revolutionize your virtual communication experience. With ClarityCall, you can enjoy seamless real-time video and audio interactions, integrated with AI-powered features such as live translation and gesture recognition. Dive into our platform to connect, collaborate, and interact more effectively, whether for business meetings, educational sessions, or casual catch-ups. Embrace the future of video conferencing with ClarityCall!

## :tada: Quick Start

1. [Log in](https://claritycall.co/signin) with a test account:
   | Email | Password |
   | --------------- | ----------- |
   | user4@test.com | 12345678hi |
   <img width="500" alt="signin" src="https://github.com/LJT-512/ClarityCall/assets/86831309/243217dd-88f9-4eea-807e-a7c6f67c1f01">
2. Create or join a meeting and start experiencing Clarity Call.

## Features

### 🎥 Real-Time Video and Audio Streaming

- Experience real-time video and audio streaming.
- Utilizes WebRTC for seamless peer-to-peer communication.

### 🌐 AI-Powered Live Translation and Summary

- Break language barriers with real-time translation with OpenAI API.
- Get concise summaries of meetings.

### ✍ Gesture Recognition Whiteboard

- Interact with a whiteboard using just your gestures.
- Powered by Google's MediaPipe and enhanced with OpenCV.

https://github.com/LJT-512/ClarityCall/assets/86831309/6e680350-76d4-4add-bbfb-1318d8a35934

### 🚀 Breakout Room Sessions

- Split into breakout sessions for targeted discussions, ideal for workshops, classes, and team meetings.

https://github.com/LJT-512/ClarityCall/assets/86831309/49fb6c6e-f9a0-4944-96eb-7e1b8bbf454a

### 📊 Persistent Data Storage and Analytics

- Securely store meeting data with AWS RDS and PostgreSQL.
- Analyze meeting engagement with integrated Chart.js and D3.js analytics.

https://github.com/LJT-512/ClarityCall/assets/86831309/bade07f6-b707-4656-82ad-2c775486752d

## Tech Stack

 <img width="1000" alt="claritycall" src="https://github.com/LJT-512/ClarityCall/assets/86831309/2df3eeef-afd7-43fc-8ee6-215e1ddd3324">
 
### Server-Side
![Nodejs](https://img.shields.io/badge/Node.js-343434?style=for-the-badge&logo=node.js&logoColor=3C873A)
![Express.js](https://img.shields.io/badge/Express.js-343434?style=for-the-badge&logo=express)
![SocketIo](https://img.shields.io/badge/Socket.io-343434?&style=for-the-badge&logo=Socket.io)
![NGINX](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)
- Node.js with Socket.io: Manages real-time bidirectional event-based communication, facilitating features like live chat and signaling for WebRTC.
- NGINX: Acts as a reverse proxy on AWS EC2, providing efficient load balancing and SSL termination for secure connections.
Infrastructure

### Client-Side

![HTML](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![BootStrap](https://img.shields.io/badge/Bootstrap-563D7C?style=for-the-badge&logo=bootstrap&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart%20js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)
![D3.js](https://img.shields.io/badge/d3%20js-F9A03C?style=for-the-badge&logo=d3.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-323330?style=for-the-badge&logo=javascript&logoColor=F7DF1E)
![openCV](https://img.shields.io/badge/OpenCV-27338e?style=for-the-badge&logo=OpenCV&logoColor=white)

- WebRTC: Enables real-time communication for video and audio streaming directly in the web browser without the need for plugins or third-party software.
- MediaPipe and OpenCV: Power the gesture recognition and image processing, adding a layer of interactivity with hand-tracking capabilities for whiteboard functionality.

## Infrastructure

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![AWS](https://img.shields.io/badge/Amazon_AWS-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)

- STUN/TURN Servers: Assists in network traversal, helping peers to find the best path for the media stream to travel across different networks.
- AWS RDS (PostgreSQL): Serves as the persistent data storage, ensuring data integrity and efficient access for meeting analytics.
- AWS CloudWatch: Monitors the application's performance, offering real-time logging and diagnostics.
  Continuous Integration and Deployment
  GitHub Actions: Automates the CI/CD pipeline, enabling consistent and reliable code integration and deployment processes.
