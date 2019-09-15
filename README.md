# CorpsGuardServiceBackend

Devpost Link: https://devpost.com/software/corps-of-cadets-guardroom-app

A Full-Stack application that will streamline the existing Corps of Cadets safe escort service for students.

Reference: https://today.tamu.edu/2015/10/14/corps-offers-safe-escort-on-campus/

Currently, students call the Guardroom phone number to request a cadet escort. However, this process is only done through verbal phone communication. This often creates confusion due to vague directions and inaccurate verbal descriptions of nearby locations.

In our prototype app, we have addressed these issues by:
- Creating a mobile-friendly web app where students can accurately find their current location and destination via Google Maps.
- Students just enter their name and phone number to request a cadet escort. Only the student's name, phone number, current location, and destination are sent to an Azure Web Server.
- Upon receiving a request, the Azure Web Server sends emails and SMS to Guardroom cadets displaying the student's information and a static image of the student's intended path.
- Cadets respond by logging into a separate online portal where they enter their contact info and only the phone number of the student. The cadet's contact info is then automatically sent back to the student via SMS from the Azure Web Server.

In the near future, we plan on improving this app by:
- Using live data transmission so both student and cadet know where each other are in real-time.
- Creating a mobile-app for push-notifications.
- Adding SMS communication in mobile-app (offline functionality).
- Integrating this service with CAS, so students don't need to manually log in.
