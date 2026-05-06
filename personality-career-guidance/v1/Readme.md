**Updates Done:**
1) Logos were Added.
2) Date field was removed. Timestamp was maintained on the spreadsheet.
3) same color was updated on the progress bar based on the personality fields.


**Implementation steps:**
1) In Code.gs update the spreadsheet ID.
   Line No : 5 (const SPREADSHEET_ID = "Your Spreadsheet ID";) 

   if you change the sheet the sheet name, then change that one also
   ( const SPREADSHEET_ID = "1LqgsFVJAAbSnNWgRudQZMLglWp2IIw1O04ICal7_nSs";
     const SHEET_NAME = "Sheet1"; )

2) Upload the three logos in your DRIVE (CloudCounselage main email Drive folder)
    further steps: 
    2:1 Click the three dots on the image file on Drive 
    2:2 click share and once again share
    2:3 Click General Access with **Anyone with the link **
    2:4 Copy the link 
    2:5 the link will be like this (https://drive.google.com/file/d/**1P7zwTpkuRCGEyVHXnJVgkJG68ZTsb_Xv**/view?usp=sharing)
    2:6 replace id= with this **id=1P7zwTpkuRCGEyVHXnJVgkJG68ZTsb_Xv**, in the following lines **344, 348, 353** just id 

    Important: Don't change the entire url, just update the ID.

    logo-left  --- logo.png
    logo-right --- GAC.png
    logo-Center --- IAC.png