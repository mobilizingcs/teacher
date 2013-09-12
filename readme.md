Ohmage Class/Campaign management tool for teachers
--------------------------------------------------

Depends: `ohmage-2.16-user_setup_password`

This tool was developed to let lausd teachers easily deploy a set of predefined campaigns. Users of the tool (i.e. teachers)
must have the special "user setup" and "class create" privileges.

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
then the tool automatically deploys the campaigns `OneDayTrash.xml` and `TrashType` and adds these these campaigns to this class.









