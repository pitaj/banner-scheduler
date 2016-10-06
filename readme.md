## Banner Course Scheduler
This is a utility which hooks into the Ellucian Banner online interface (ex: [MSU MyInfo](https://atlas.montana.edu:9000)) and allows searching through the class catalog with a variety of filters including everything available through the [Schedule of Classes - find CRN here](https://atlas.montana.edu:9000/pls/bzagent/bzskcrse.PW_SelSchClass) page. It allows students to add classes to a weekly calendar where they can see time conflicts easily. 

Features:

- Search for classes and add them to the weekly calendar
- Print the calendar to a PDF, or export it to an iCal file
- View conflicting classes and resolve conflicts easily
- Dynamic interface, no need to open ten tabs to figure out your schedule

![Scheduler Interface showing classes and schedule](http://i.imgur.com/m7FuGRP.png)

This utility was built with the following technologies:

- [Bootstrap](http://getbootstrap.com/)
- [Electron](http://electron.atom.io/)
- [Node.js](https://nodejs.org/en/)
- [Request](https://github.com/request/request)
- [iCal-generator](https://github.com/sebbo2002/ical-generator)
- [Cheerio](https://github.com/cheeriojs/cheerio)
- [jQuery](http://jquery.com/)

