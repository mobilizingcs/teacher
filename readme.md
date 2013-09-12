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

      


