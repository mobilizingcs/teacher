all:
	jar cvf ~/Desktop/teacher.war *
	scp ~/Desktop/teacher.war apollo.ohmage.org:~
