Ohmage Class/Campaign management tool for teachers
--------------------------------------------------

Depends: 
 * `ohmage-2.16-user_setup_password`
 * A browser supporting HTML5

This tool was developed to let lausd teachers easily deploy a set of predefined campaigns. 
Users of the tool (i.e. teachers) must have the special "user setup" and "class create" privileges, 
and have a valid Last name and Organization name set for their ohmage account.
The last name and organization name are needed determine the URN of newly created classes and campaigns. 

The following naming conventions are used:

    campaign urn: urn:campaign:lausd:year:semester:SchoolName:Teacher:Subject:Period:CampaignName
    campaign name: CampaignName Period Teacher Year
    class urn: urn:class:lausd:year:semester:SchoolName:Teacher:Subject:Period
    class name: Subject Period Teacher Year
    
The value `urn:campaign:lausd` is hardcoded and only campaigns starting with this prefix will be listed.

## Class-Campaign combinations

When the user creates a new class, the tool automatically deploys a set of campaigns. These are configured at the top of the `index.js` file e.g:

	var subjectcampaigns = {
		"science" : ["OneDayTrash", "TrashType"],
		"math" : ["Nutrition"],
		"ecs" : ["Media", "Snack"]
	};
	
The values correspond to files located in the `xml` subdirectory. For example, when the creates a class with Subject: `science`
then the tool automatically deploys the campaigns `OneDayTrash.xml` and `TrashType.xml` and adds these these campaigns to this class.
When deleting a class, the tool automatically deleted the corresponding campaigns (according to the naming convention mentioned above).

## Managing users

After selecting a class, the tool navigates to a page to allow the user to manipulate users in the class.
Note that not all class members are shown, only users that were created with the `/user/setup` API are listed.

New students are added by uploading a CSV file that following internal LAUSD conventions. 
This means that the CSV file is formatted according to standard csv, and the first line contains column headers.
The columns `Student ID` and `Student Name` must be present and the latter is a single quoted string formatted as `Lastname, Firstname`.

## Licensing
The code in this respository is open-source and licensed under the Apache License, version 2.0. The full text of the license may be found at this link: http://www.apache.org/licenses/LICENSE-2.0.


 









