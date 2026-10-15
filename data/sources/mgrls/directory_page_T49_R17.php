

<!DOCTYPE html>
<html lang="en">
<head>
		 <base href="https://bibblib.org/directory_page_T49_R17.php" />	


<link href="/revize/plugins/setup/css/revize.css" rel="stylesheet" type="text/css" />
<link rel="stylesheet" href="/revize/plugins/document_center/document_center_styles.css">
<script type="text/javascript" src="/revize/plugins/document_center/simple_accordian.js"></script><script type="text/javascript">

//----- Check href of all <a...> tags, if it matchs page url and immediate parent is <LI>,
//		append "active" to className of all ancestor <LI> tags until the parent of the <LI>
//		tag is not <UL> or the parent of the <UL> is not another <LI> tag.
var functionRef = function setClassActive()
{
	var e;
	try
	{
		var pattern = new RegExp("http[s]?://.*?/(.*)[?#]?","");
		var tags = document.getElementsByTagName("A");
		if (tags)
		{
			for (var i=0;i<tags.length;i++)
			{
				var el = tags[i];
				var resultsTag = el.href.match(pattern);
				var resultsPage = location.href.match(pattern);
				if (!resultsTag || !resultsPage) continue;
				if (resultsTag[1] != resultsPage[1]) continue;
	
				// go up li tree marking this and all parent class=active
				var li = el.parentNode;
				while (li && li.tagName == 'LI')
				{
					if (li.className != '') 
						li.className += ' ';
					li.className += 'active';
					var ul = li.parentNode;
					if (!ul || ul.tagName != 'UL') break;
					li = ul.parentNode;
				}
				//let's catch all links e.g. topnav, leftnav, quick links, etc
				//break;	//found url match, quit checking tags
			}
		}
	}
	catch (e) {}
}
//----- Activate topnavActive once page loads
if (typeof addEventListener != 'undefined') addEventListener('load', functionRef, false);	//standards browser
else if (typeof attachEvent != 'undefined') attachEvent("onload", functionRef);				//IE early versions
</script>



<script type="text/javascript">



</script>




	
	
	



	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="viewport" content="width=device-width, initial-scale=1">

	<link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;500;700;900&family=Playfair+Display:wght@400;700&family=Source+Sans+Pro:wght@400;700&display=swap" rel="stylesheet">

	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/css/bootstrap.min.css" integrity="sha384-B0vP5xmATw1+K9KRQjQERJvTumQW0nPEzvF6L/Z6nronJ3oUOFUFpCjEUQouq2+l" crossorigin="anonymous">
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/tiny-slider/2.9.3/tiny-slider.css">
	<link rel="stylesheet" href="_assets_/fonts/font-awesome/css/all.min.css">
	<!--[if (lt IE 9)]><script src="_assets_/plugins/tiny-slider/dist/min/tiny-slider.helper.ie8.js"></script><![endif]-->
	
	<link rel="stylesheet" href="/revize/plugins/general_directory/includes/business-directory-styles.css">

	<script src="https://code.jquery.com/jquery-3.5.1.min.js" integrity="sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0=" crossorigin="anonymous"></script>

	<!-- Metadata Area Starts -->





	<title>Middle Georgia Regional Library</title>
	<meta property="og:title" content="Middle Georgia Regional Library" />



	<meta name="keywords" content="Middle Georgia Regional Library"/>



	<meta name="description" content=""/>
	<meta property="og:description" content="" />


	 

<meta property="og:image" content="//webgen1.revize.com/revize/logo/logo-large.png?t=1689779283330" />



	<meta name="robots" content="index, follow">



<link rel="shortcut icon" href="logo/Middle Georgia Regional Library.png?t=1689779283330">

<link rel="apple-touch-icon" href="_assets_/images/touch-icon-ipad2.png?t=1689779283330">
<link rel="apple-touch-icon" sizes="72x72" href="_assets_/images/touch-icon-ipad2.png?t=1689779283330">
<link rel="apple-touch-icon" sizes="114x114" href="_assets_/images/touch-icon-ipad2.png?t=1689779283330">
<link rel="apple-touch-icon" sizes="144x144" href="_assets_/images/touch-icon-ipad2.png?t=1689779283330">

	

	<link href="/revize/plugins/revize_calendar/core/main.css" rel="stylesheet" />
<link href="/revize/plugins/revize_calendar/daygrid/main.min.css" rel="stylesheet" />
<link href="/revize/plugins/revize_calendar/timegrid/main.min.css" rel="stylesheet" />
<link href="/revize/plugins/revize_calendar/list/main.min.css" rel="stylesheet" />
<link href="_assets_/plugins/revizeCalendar/css/mini.css" rel="stylesheet" />
<link href="/revize/plugins/revize_calendar/core/nav-panels.css" rel="stylesheet" /><script>
	var defaultCalendarColor = "#3788d8";
	var ImportCals = [];
	var calendarProps = {'6' : { 'color' : '' , 'name' : 'calendar-list-options' },
};
	var RZCalendarTimezone = "";
</script>


	<link rel="stylesheet" href="_assets_/css/layout.css?t=1689779283330">
	<link rel="stylesheet" href="_assets_/css/styles.css?t=1689779283330">

	<!-- Respond.js for IE8 support of HTML5 elements and media queries -->
	<!--[if lt IE 9]>
	  <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
	<![endif]-->

</head>
<body id='freeform' class='fullwidth'>
    <a href="#main" id="skip">Skip to main content</a>





<script type="text/javascript">
if (typeof(RZ) == 'undefined') RZ = {};
if (!RZ.link) RZ.link = new Object();
RZ.pagetype = 'template'
RZ.baseurlprefix = ''
RZ.baseurlpath = ''
RZ.protocolRelativeRevizeBaseUrl='//webgen1.revize.com'

RZ.pagetemplatename = 'directory_page'
RZ.pagetemplateid = '49'
RZ.pagemodule = 'business_directory'
RZ.pagemoduleid = '28'
RZ.pagerecordid = '17';

RZ.pageid = 'business_directory-17';
RZ.pageparentid = '';
RZ.pagesectionid = '0';
RZ.pagesectionname = '';
RZ.pagesectionlevel = '0';
RZ.pagesectionfolder = '';
RZ.pagesectionfilter = 'sectionid=0';
RZ.pagelinkfilter = 'linklevel=0 and linksectionid=0';
RZ.pagelinklevel = '0';
RZ.pagelinkid = '95';
RZ.pageidfield = 'pageid';

RZ.isnewrecord = false;
RZ.editmodule = '';
RZ.editrecordid = '17';
RZ.editrecordversion = '';
RZ.editversion = '';
RZ.editaction = '';

RZ.page_roles = ''
RZ.page_users = ''
RZ.page_key = 'directory_page[17]'
RZ.parent_key = 'freeform[95]'
RZ.inherit_key = ''
RZ.workflowname = ''
RZ.permissions_options = ''
RZ.permissions_module = 'webspace_page_permissions'
RZ.webspace = 'middlegeorgialibraryga'
RZ.webspacedesc = "Georgia Library";

RZ.featurespattern = '(EZ)';
null

RZ.webspacelinksurl = ''
RZ.webspacelinksurl = './webspace/links.html'
RZ.workflowlist = ''
RZ.revizeserverurl = 'https://webgen1.revize.com/revize/middlegeorgialibraryga';

if (!RZ.nextseq) RZ.nextseq = {linknames:{},modules:{}};

RZ.webspace_config = new Object();
RZ.webspace_config.admin_email = "noreply@co.walla-walla.wa.us";
RZ.webspace_config.calendar_options = "max_events=4";
RZ.webspace_config.form_captcha = "yes";
RZ.webspace_config.form_server = "revizeserver";
RZ.webspace_config.form_technology = "jsp";
RZ.webspace_config.formwizard_ftp_password = "";
RZ.webspace_config.formwizard_ftp_port = "";
RZ.webspace_config.formwizard_ftp_server = "";
RZ.webspace_config.formwizard_ftp_user = "";
RZ.webspace_config.formwizard_setup = "yes";
RZ.webspace_config.formwizard_smtp_password = "xxx";
RZ.webspace_config.formwizard_smtp_server = "xxx";
RZ.webspace_config.formwizard_smtp_user = "xxx";
RZ.webspace_config.google_analytics = "";
RZ.webspace_config.home_pageid = "0";
RZ.webspace_config.home_sectionid = "0";
RZ.webspace_config.home_template = "home,index,sitemap";
RZ.webspace_config.icon_email = "<img src=\"/revize/images/email_icon_yellow.gif\" width=\"16\" border=\"0\" height=\"17\" title=\"Request email notification when page changes\" alt=\"Request email notification when page changes\" style=\"\" />";
RZ.webspace_config.image_maxheight = "3000";
RZ.webspace_config.image_maxwidth = "3000";
RZ.webspace_config.image_setup = "yes";
RZ.webspace_config.livesite_url = "";
RZ.webspace_config.menu_links_module = "links";
RZ.webspace_config.menu_newsection = "";
RZ.webspace_config.menu_nexturl = "webspace_menu-editform.jsp";
RZ.webspace_config.menu_sections_module = "sections";
RZ.webspace_config.menu_system = "custom";
RZ.webspace_config.menu_version = "1.00";
RZ.webspace_config.new_menu_manager_enabled = "yes";
RZ.webspace_config.notify_return_url = "enotify/index.php";
RZ.webspace_config.rte_setup = "yes";
RZ.webspace_config.to_email = "";
RZ.webspace_config.use_folders = "1";
RZ.webspace_config.use_new_buttons = "yes";

RZ.isauthenticationactive = true
RZ.warning = ""
RZ.adminwinmsg = null

RZ.channels = 'revize,fileschannel';
RZ.jsversion = 1.2</script>
<script type="text/javascript" src="/revize/util/snippet_helper.js"></script>



<header id="main-header">

    <div class="header-top">
        <div class="header-col" social-translate>
            <div class="smls">
				




				
							<a aria-label="facebook" href="https://www.facebook.com/MGRLibraries/" target="_blank" class="fab fa-facebook-f sml" style="color:#61aa45"></a>
						
							<a aria-label="instagram" href="https://www.instagram.com/MGRLibraries/" target="_blank" class="fab fa-instagram sml" style="color:#61aa45"></a>
						
							<a aria-label="twitter" href="https://twitter.com/MGRLibraries" target="_blank" class="fab fa-twitter sml" style="color:#61aa45"></a>
						
            </div><!--/.smls-->
            <div id="google-translate" class="d-none">
                <script>
                    function googleTranslateElementInit() {
                        new google.translate.TranslateElement({pagelanguage: 'en',
                            layout: google.translate.TranslateElement.InlineLayout.SIMPLE},
                            'google-translate');
                    }
                </script>
            </div><!--/#google-translate-->
            <ul class="translation-links">
                <li><button type="button" class="translate-button" aria-label="translate page" aria-haspopup="true" aria-expanded="false">Translate page <i class="fa fa-caret-down"></i></button>
                    <ul class="clearfix" aria-labelledby="translate-button">
                        <li><a href="#" class="English" data-lang="English"><strong translate="no">English</strong></a></li>
                        <li><a href="#" class="Afrikaans" data-lang="Afrikaans">Afrikaans</a></li>
                        <li><a href="#" class="Albanian" data-lang="Albanian">Albanian</a></li>
                        <li><a href="#" class="Arabic" data-lang="Arabic">Arabic</a></li>
                        <li><a href="#" class="Armenian" data-lang="Armenian">Armenian</a></li>
                        <li><a href="#" class="Azerbaijani" data-lang="Azerbaijani">Azerbaijani</a></li>
                        <li><a href="#" class="Basque" data-lang="Basque">Basque</a></li>
                        <li><a href="#" class="Belarusian" data-lang="Belarusian">Belarusian</a></li>
                        <li><a href="#" class="Bengali" data-lang="Bengali">Bengali</a></li>
                        <li><a href="#" class="Bosnian" data-lang="Bosnian">Bosnian</a></li>
                        <li><a href="#" class="Bulgarian" data-lang="Bulgarian">Bulgarian</a></li>
                        <li><a href="#" class="Catalan" data-lang="Catalan">Catalan</a></li>
                        <li><a href="#" class="Cebuano" data-lang="Cebuano">Cebuano</a></li>
                        <li><a href="#" class="Chinese" data-lang="Chinese (Simplified)">Chinese (Simplified)</a></li>
                        <li><a href="#" class="Chinese" data-lang="Chinese (Traditional)">Chinese (Traditional)</a></li>
                        <li><a href="#" class="Croatian" data-lang="Croatian">Croatian</a></li>
                        <li><a href="#" class="Czech" data-lang="Czech">Czech</a></li>
                        <li><a href="#" class="Danish" data-lang="Danish">Danish</a></li>
                        <li><a href="#" class="Dutch" data-lang="Dutch">Dutch</a></li>
                        <li><a href="#" class="Esperanto" data-lang="Esperanto">Esperanto</a></li>
                        <li><a href="#" class="Estonian" data-lang="Estonian">Estonian</a></li>
                        <li><a href="#" class="Filipino" data-lang="Filipino">Filipino</a></li>
                        <li><a href="#" class="Finnish" data-lang="Finnish">Finnish</a></li>
                        <li><a href="#" class="French" data-lang="French">French</a></li>
                        <li><a href="#" class="Galician" data-lang="Galician">Galician</a></li>
                        <li><a href="#" class="Georgian" data-lang="Georgian">Georgian</a></li>
                        <li><a href="#" class="German" data-lang="German">German</a></li>
                        <li><a href="#" class="Greek" data-lang="Greek">Greek</a></li>
                        <li><a href="#" class="Gujarati" data-lang="Gujarati">Gujarati</a></li>
                        <li><a href="#" class="Haitian Creole" data-lang="Haitian Creole">Haitian Creole</a></li>
                        <li><a href="#" class="Hausa" data-lang="Hausa">Hausa</a></li>
                        <li><a href="#" class="Hebrew" data-lang="Hebrew">Hebrew</a></li>
                        <li><a href="#" class="Hindi" data-lang="">Hindi</a></li>
                        <li><a href="#" class="Hmong" data-lang="Hmong">Hmong</a></li>
                        <li><a href="#" class="Hungarian" data-lang="Hungarian">Hungarian</a></li>
                        <li><a href="#" class="Icelandic" data-lang="Icelandic">Icelandic</a></li>
                        <li><a href="#" class="Igbo" data-lang="Igbo">Igbo</a></li>
                        <li><a href="#" class="Indonesian" data-lang="Indonesian">Indonesian</a></li>
                        <li><a href="#" class="Irish" data-lang="Irish">Irish</a></li>
                        <li><a href="#" class="Italian" data-lang="Italian">Italian</a></li>
                        <li><a href="#" class="Japanese" data-lang="Japanese">Japanese</a></li>
                        <li><a href="#" class="Javanese" data-lang="Javanese">Javanese</a></li>
                        <li><a href="#" class="Kannada" data-lang="Kannada">Kannada</a></li>
                        <li><a href="#" class="Khmer" data-lang="Khmer">Khmer</a></li>
                        <li><a href="#" class="Korean" data-lang="Korean">Korean</a></li>
                        <li><a href="#" class="Lao" data-lang="Lao">Lao</a></li>
                        <li><a href="#" class="Latin" data-lang="Latin">Latin</a></li>
                        <li><a href="#" class="Latvian" data-lang="Latvian">Latvian</a></li>
                        <li><a href="#" class="Lithuanian" data-lang="Lithuanian">Lithuanian</a></li>
                        <li><a href="#" class="Macedonian" data-lang="Macedonian">Macedonian</a></li>
                        <li><a href="#" class="Malay" data-lang="Malay">Malay</a></li>
                        <li><a href="#" class="Maltese" data-lang="Maltese">Maltese</a></li>
                        <li><a href="#" class="Maori" data-lang="Maori">Maori</a></li>
                        <li><a href="#" class="Marathi" data-lang="Marathi">Marathi</a></li>
                        <li><a href="#" class="Mongolian" data-lang="Mongolian">Mongolian</a></li>
                        <li><a href="#" class="Nepali" data-lang="Nepali">Nepali</a></li>
                        <li><a href="#" class="Norwegian" data-lang="Norwegian">Norwegian</a></li>
                        <li><a href="#" class="Persian" data-lang="Persian">Persian</a></li>
                        <li><a href="#" class="Polish" data-lang="Polish">Polish</a></li>
                        <li><a href="#" class="Portuguese" data-lang="Portuguese">Portuguese</a></li>
                        <li><a href="#" class="Punjabi" data-lang="Punjabi">Punjabi</a></li>
                        <li><a href="#" class="Romanian" data-lang="Romanian">Romanian</a></li>
                        <li><a href="#" class="Russian" data-lang="Russian">Russian</a></li>
                        <li><a href="#" class="Serbian" data-lang="Serbian">Serbian</a></li>
                        <li><a href="#" class="Slovak" data-lang="Slovak">Slovak</a></li>
                        <li><a href="#" class="Slovenian" data-lang="Slovenian">Slovenian</a></li>
                        <li><a href="#" class="Somali" data-lang="Somali">Somali</a></li>
                        <li><a href="#" class="Spanish" data-lang="Spanish">Spanish</a></li>
                        <li><a href="#" class="Swahili" data-lang="Swahili">Swahili</a></li>
                        <li><a href="#" class="Swedish" data-lang="Swedish">Swedish</a></li>
                        <li><a href="#" class="Tamil" data-lang="Tamil">Tamil</a></li>
                        <li><a href="#" class="Telugu" data-lang="Telugu">Telugu</a></li>
                        <li><a href="#" class="Thai" data-lang="Thai">Thai</a></li>
                        <li><a href="#" class="Turkish" data-lang="Turkish">Turkish</a></li>
                        <li><a href="#" class="Ukrainian" data-lang="Ukrainian">Ukrainian</a></li>
                        <li><a href="#" class="Urdu" data-lang="Urdu">Urdu</a></li>
                        <li><a href="#" class="Vietnamese" data-lang="Vietnamese">Vietnamese</a></li>
                        <li><a href="#" class="Welsh" data-lang="Welsh">Welsh</a></li>
                        <li><a href="#" class="Yiddish" data-lang="Yiddish">Yiddish</a></li>
                        <li><a href="#" class="Yoruba" data-lang="Yoruba">Yoruba</a></li>
                        <li><a href="#" class="Zulu" data-lang="Zulu">Zulu</a></li>
                    </ul>
                </li>
            </ul><!--/.translation-links-->
        </div><!--/.header-col-->
        <div class="header-col" logo>
            






<a href="./" id="logo">
	<img src="logo/logo-large.png" alt="Middle Georgia Regional Library logo">
	
</a><!--/#logo-->
            <div id="toggles" class="d-lg-none">
                <button id="search-toggle" class="fa fa-search"></button>
                <button id="nav-toggle" class="fa fa-bars"></button>
            </div><!--/#toggles-->
        </div><!--/.header-col-->
        <div class="header-col" search>
			

<div class="search clearfix">
	<ul class="search-tabs">
		<li><button class="search-tabs-toggle"><span>Catalog</span> <i class="fa fa-caret-down"></i></button>
			<ul>
				<li><button class="search-option">Catalog</button></li>
				<li><button class="search-option">Site</button></li>
			</ul>
		</li>
	</ul><!--/.search-tabs-->
	<div class="search-tabs-content">
		<form action="https://gapines.org/eg/opac/results?" method="GET" aria-label="" class="active">
			<input type="hidden" name="locg" value="233" />
			<input aria-label="Search Catalog" name="query" type="text" placeholder="Search Catalog...">
			<button aria-label="Search Button"><svg  xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="24px" height="24px"><path fill-rule="evenodd" fill="rgb(36, 28, 21)" d="M23.419,23.417 C23.149,23.688 22.711,23.688 22.441,23.417 L15.963,16.940 C14.308,18.369 12.178,19.264 9.820,19.264 C4.602,19.264 0.373,15.035 0.373,9.818 C0.373,4.600 4.602,0.371 9.820,0.371 C15.037,0.371 19.267,4.600 19.267,9.818 C19.267,12.176 18.371,14.306 16.942,15.962 L23.419,22.439 C23.689,22.709 23.689,23.147 23.419,23.417 ZM17.813,9.818 C17.813,5.404 14.234,1.825 9.820,1.825 C5.405,1.825 1.826,5.404 1.826,9.818 C1.826,14.233 5.405,17.812 9.820,17.812 C14.234,17.812 17.813,14.233 17.813,9.818 Z"/></svg></button>
		</form>
		<form class="search-form" method="GET" action="search.php" role="search" aria-label="sitewide">
			<input aria-label="Search Site" name="q" class="form-control search-input" placeholder="Search Site..." type="search" id="search-input">
			<button aria-label="Search Button"><svg  xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="24px" height="24px"><path fill-rule="evenodd" fill="rgb(36, 28, 21)" d="M23.419,23.417 C23.149,23.688 22.711,23.688 22.441,23.417 L15.963,16.940 C14.308,18.369 12.178,19.264 9.820,19.264 C4.602,19.264 0.373,15.035 0.373,9.818 C0.373,4.600 4.602,0.371 9.820,0.371 C15.037,0.371 19.267,4.600 19.267,9.818 C19.267,12.176 18.371,14.306 16.942,15.962 L23.419,22.439 C23.689,22.709 23.689,23.147 23.419,23.417 ZM17.813,9.818 C17.813,5.404 14.234,1.825 9.820,1.825 C5.405,1.825 1.826,5.404 1.826,9.818 C1.826,14.233 5.405,17.812 9.820,17.812 C14.234,17.812 17.813,14.233 17.813,9.818 Z"/></svg></button>
		</form><!--/.search-form-->
	</div><!--/.search-tabs-content-->
</div><!--/.search.clearfix-->

            
        </div><!--/.header-col-->
    </div><!--/.header-top-->
    <nav id="topnav" mega>

				


 
<ul id="nav" class="topnav v2_05-23-2012">
	<li class="menuLI level0 menuDisplay li-834 children"><a class="menuA level0 menuDisplay" href="locations_hours.php" target="_self">Locations</a>
		<ul class="menuUL level1 menuHidden ul-939">
			<li class="menuLI level1 menuHidden li-939 children"><a class="menuA level1 menuHidden" href="locations_hours.php" target="_self">Baldwin County</a>
				<ul class="menuUL level2 menuHidden ul-941">
					<li class="menuLI level2 menuHidden li-941"><a class="menuA level2 menuHidden" href="directory_page_T49_R53.php" target="_self">Hancock Branch</a></li>
					<li class="menuLI level2 menuHidden li-940"><a class="menuA level2 menuHidden" href="directory_page_T49_R58.php" target="_self">Lake Sinclair Library</a></li>
					<li class="menuLI level2 menuHidden li-942"><a class="menuA level2 menuHidden" href="directory_page_T49_R59.php" target="_self">Mary Vinson Memorial Library</a></li>
				</ul>
			</li>
			<li class="menuLI level1 menuHidden li-857 children"><a class="menuA level1 menuHidden" href="locations_hours.php# " target="_self">Bibb County</a>
				<ul class="menuUL level2 menuHidden ul-858">
					<li class="menuLI level2 menuHidden li-858"><a class="menuA level2 menuHidden" href="directory_page_T49_R55.php" target="_self">Bloomfield Public Library</a></li>
					<li class="menuLI level2 menuHidden li-1107"><a class="menuA level2 menuHidden" href="directory_page_T49_R73.php" target="_self">Cathy Ivey Community Library</a></li>
					<li class="menuLI level2 menuHidden li-859"><a class="menuA level2 menuHidden" href="directory_page_T49_R3.php" target="_self">Charles A. Lanford, M.D. Library</a></li>
					<li class="menuLI level2 menuHidden li-1162"><a class="menuA level2 menuHidden" href="https://bibblib.org/directory_page_T49_R83.php" target="_new">Downtown Bus Station Book Locker</a></li>
					<li class="menuLI level2 menuHidden li-1006"><a class="menuA level2 menuHidden" href="directory_page_T49_R68.php" target="_self">Library Annex</a></li>
					<li class="menuLI level2 menuHidden li-866"><a class="menuA level2 menuHidden" href="directory_page_T49_R56.php" target="_self">Library WOW</a></li>
					<li class="menuLI level2 menuHidden li-872"><a class="menuA level2 menuHidden" href="directory_page_T49_R5.php" target="_self">Shurling Public Library</a></li>
					<li class="menuLI level2 menuHidden li-874"><a class="menuA level2 menuHidden" href="directory_page_T49_R2.php" target="_self">Washington Memorial Library</a></li>
				</ul>
			</li>
			<li class="menuLI level1 menuHidden li-943 children"><a class="menuA level1 menuHidden" href="locations_hours.php" target="_self">Crawford County</a>
				<ul class="menuUL level2 menuHidden ul-944">
					<li class="menuLI level2 menuHidden li-944"><a class="menuA level2 menuHidden" href="directory_page_T49_R8.php" target="_self">Crawford County Library</a></li>
				</ul>
			</li>
			<li class="menuLI level1 menuHidden li-945 children"><a class="menuA level1 menuHidden" href="locations_hours.php" target="_self">Jones County</a>
				<ul class="menuUL level2 menuHidden ul-946">
					<li class="menuLI level2 menuHidden li-946"><a class="menuA level2 menuHidden" href="directory_page_T49_R10.php" target="_self">Jones County Library</a></li>
				</ul>
			</li>
			<li class="menuLI level1 menuHidden li-947 children"><a class="menuA level1 menuHidden" href="locations_hours.php" target="_self">Macon County</a>
				<ul class="menuUL level2 menuHidden ul-948">
					<li class="menuLI level2 menuHidden li-948"><a class="menuA level2 menuHidden" href="directory_page_T49_R12.php" target="_self">Marshallville Library</a></li>
					<li class="menuLI level2 menuHidden li-949"><a class="menuA level2 menuHidden" href="directory_page_T49_R13.php" target="_self">Montezuma Library</a></li>
					<li class="menuLI level2 menuHidden li-950"><a class="menuA level2 menuHidden" href="directory_page_T49_R14.php" target="_self">Oglethorpe Public Library</a></li>
				</ul>
			</li>
			<li class="menuLI level1 menuHidden li-951 children"><a class="menuA level1 menuHidden" href="locations_hours.php" target="_self">Twiggs County</a>
				<ul class="menuUL level2 menuHidden ul-952">
					<li class="menuLI level2 menuHidden li-952"><a class="menuA level2 menuHidden" href="directory_page_T49_R15.php" target="_self">Twiggs County Public Library</a></li>
				</ul>
			</li>
			<li class="menuLI level1 menuHidden li-953 children"><a class="menuA level1 menuHidden" href="locations_hours.php" target="_self">Wilkinson County</a>
				<ul class="menuUL level2 menuHidden ul-954">
					<li class="menuLI level2 menuHidden li-954"><a class="menuA level2 menuHidden" href="directory_page_T49_R16.php" target="_self">East Wilkinson Library</a></li>
					<li class="menuLI level2 menuHidden li-955"><a class="menuA level2 menuHidden" href="directory_page_T49_R17.php" target="_self">Gordon Public Library</a></li>
				</ul>
			</li>
		</ul>
	</li>
	<li class="menuLI level0 menuDisplay li-98 children"><a class="menuA level0 menuDisplay" href="services/index.php" target="_self">What We Offer</a>
		<ul class="menuUL level1 menuHidden ul-161">
			<li class="menuLI level1 menuHidden li-161 children"><a class="menuA level1 menuHidden" href="services/accessible_services.php" target="_self">Accessible Services</a>
				<ul class="menuUL level2 menuHidden ul-132">
					<li class="menuLI level2 menuHidden li-132"><a class="menuA level2 menuHidden" href="services/curbside_services.php" target="_self">Curbside Services</a></li>
					<li class="menuLI level2 menuHidden li-162"><a class="menuA level2 menuHidden" href="services/open_access.php" target="_self">Open Access</a></li>
				</ul>
			</li>
			<li class="menuLI level1 menuHidden li-156 children"><a class="menuA level1 menuHidden" href="services/reference/index.php" target="_self">Adult Services</a>
				<ul class="menuUL level2 menuHidden ul-273">
					<li class="menuLI level2 menuHidden li-273"><a class="menuA level2 menuHidden" href="services/reference/ask_a_librarian.php" target="_self">Adult Literacy Assistance</a></li>
					<li class="menuLI level2 menuHidden li-158"><a class="menuA level2 menuHidden" href="services/interlibrary_loan_program.php" target="_self">Interlibrary Loan Program</a></li>
					<li class="menuLI level2 menuHidden li-157"><a class="menuA level2 menuHidden" href="services/memory_lab.php" target="_self">Memory Lab</a></li>
					<li class="menuLI level2 menuHidden li-675"><a class="menuA level2 menuHidden" href="services/reference/reading_challenges.php" target="_self">Reading Challenges</a></li>
				</ul>
			</li>
			<li class="menuLI level1 menuHidden li-289"><a class="menuA level1 menuHidden" href="services/book_clubs.php" target="_self">Book Clubs</a></li>
			<li class="menuLI level1 menuHidden li-93"><a class="menuA level1 menuHidden" href="services/business_nonprofit_center/index.php" target="_self">Business and Nonprofit Center</a></li>
			<li class="menuLI level1 menuHidden li-133 children"><a class="menuA level1 menuHidden" href="services/computer___internet_access/index.php" target="_self">Computer & Internet Access</a>
				<ul class="menuUL level2 menuHidden ul-134">
					<li class="menuLI level2 menuHidden li-134"><a class="menuA level2 menuHidden" href="services/computer___internet_access/wireless_internet.php" target="_self">Wireless Internet</a></li>
					<li class="menuLI level2 menuHidden li-135"><a class="menuA level2 menuHidden" href="services/computer___internet_access/mobile_printing.php" target="_self">Mobile Printing</a></li>
					<li class="menuLI level2 menuHidden li-136"><a class="menuA level2 menuHidden" href="services/computer___internet_access/computer_lab_study_room.php" target="_self">Computer Access</a></li>
					<li class="menuLI level2 menuHidden li-137"><a class="menuA level2 menuHidden" href="services/computer___internet_access/computer_classes.php" target="_self">Computer Classes</a></li>
					<li class="menuLI level2 menuHidden li-138"><a class="menuA level2 menuHidden" href="services/computer___internet_access/grab_go_loaner_program.php" target="_self">Take Home Technology</a></li>
				</ul>
			</li>
			<li class="menuLI level1 menuHidden li-160"><a class="menuA level1 menuHidden" href="services/freebies.php" target="_self">Cultural Experiences</a></li>
			<li class="menuLI level1 menuHidden li-174"><a class="menuA level1 menuHidden" href="services/notary_services.php" target="_self">Fax & Notary Services</a></li>
			<li class="menuLI level1 menuHidden li-250 children"><a class="menuA level1 menuHidden" href="genealogy___archives/index.php" target="_self">Genealogical & Historical Room</a>
				<ul class="menuUL level2 menuHidden ul-189">
					<li class="menuLI level2 menuHidden li-189"><a class="menuA level2 menuHidden" href="services/memory_lab.php" target="_self">Memory Lab</a></li>
					<li class="menuLI level2 menuHidden li-187"><a class="menuA level2 menuHidden" href="services/middle_georgia_archives.php" target="_self">Middle Georgia Archives</a></li>
				</ul>
			</li>
			<li class="menuLI level1 menuHidden li-966"><a class="menuA level1 menuHidden" href="services/meeting_rooms.php" target="_self">Meeting Rooms</a></li>
			<li class="menuLI level1 menuHidden li-124 children"><a class="menuA level1 menuHidden" href="services/youth/index.php" target="_self">Youth Services</a>
				<ul class="menuUL level2 menuHidden ul-125">
					<li class="menuLI level2 menuHidden li-125"><a class="menuA level2 menuHidden" href="services/art_of_reading.php" target="_self">Art Of Reading</a></li>
					<li class="menuLI level2 menuHidden li-127"><a class="menuA level2 menuHidden" href="services/youth/story_times.php" target="_self">Storytimes</a></li>
					<li class="menuLI level2 menuHidden li-128"><a class="menuA level2 menuHidden" href="services/youth/1000_books_b4_kindergarten.php" target="_self">1,000 Books Before Kindergarten</a></li>
					<li class="menuLI level2 menuHidden li-129"><a class="menuA level2 menuHidden" href="services/youth/teen_services/index.php" target="_self">Teen Services</a></li>
					<li class="menuLI level2 menuHidden li-130"><a class="menuA level2 menuHidden" href="services/youth/summer_reading.php" target="_self">Summer Reading</a></li>
					<li class="menuLI level2 menuHidden li-131"><a class="menuA level2 menuHidden" href="services/youth/student_play_card.php" target="_self">PLAY Card Program</a></li>
				</ul>
			</li>
		</ul>
	</li>
	<li class="menuLI level0 menuDisplay li-841 children"><a class="menuA level0 menuDisplay" href="new_page/index.php" target="_self">eLibrary</a>
		<ul class="menuUL level1 menuHidden ul-848">
			<li class="menuLI level1 menuHidden li-848"><a class="menuA level1 menuHidden" href="new_page/index.php#data_axle " target="_self">Data Axle</a></li>
			<li class="menuLI level1 menuHidden li-885"><a class="menuA level1 menuHidden" href="https://bibblib.driving-tests.org/georgia/" target="_new">Driver Test Prep</a></li>
			<li class="menuLI level1 menuHidden li-856"><a class="menuA level1 menuHidden" href="https://go.openathens.net/redirector/gapines.org?url=https%3A%2F%2Fsearch.ebscohost.com%2Flogin.aspx%3Fauthtype%3Dshib%26custid%3Dmgr1%26profile%3Dehost%26defaultdb%3De700xna" target="_new">EBSCOhost</a></li>
			<li class="menuLI level1 menuHidden li-882"><a class="menuA level1 menuHidden" href="new_page/index.php#candidsearch " target="_self">Candid Search</a></li>
			<li class="menuLI level1 menuHidden li-847"><a class="menuA level1 menuHidden" href="https://www.galileo.usg.edu/mgr1" target="_new">GALILEO</a></li>
			<li class="menuLI level1 menuHidden li-849"><a class="menuA level1 menuHidden" href="https://go.openathens.net/redirector/gapines.org?url=https%3A%2F%2Fwww.galileo.usg.edu%2Fexpress%3Flink%3Dzglf" target="_new">Gale LegalForms</a></li>
			<li class="menuLI level1 menuHidden li-852"><a class="menuA level1 menuHidden" href="https://gadd.overdrive.com/gadd-middlegeorgia/content" target="_new">GADD</a></li>
			<li class="menuLI level1 menuHidden li-1159"><a class="menuA level1 menuHidden" href="https://georgialibraries.org/grow-with-google/" target="_new">Grow with Google</a></li>
			<li class="menuLI level1 menuHidden li-854"><a class="menuA level1 menuHidden" href="https://www.hoopladigital.com/" target="_new">Hoopla</a></li>
			<li class="menuLI level1 menuHidden li-855"><a class="menuA level1 menuHidden" href="https://www.kanopy.com/en/mgrl?frontend=kui" target="_new">Kanopy</a></li>
			<li class="menuLI level1 menuHidden li-1147"><a class="menuA level1 menuHidden" href="https://www.learningexpresshub.com/ProductEngine/LELIndex.html#/learningexpresslibrary/libraryhome?Authtoken=CFD4A7C1-2A1C-42F4-B4BE-70B3F789CECB" target="_new">LearningExpress Library</a></li>
			<li class="menuLI level1 menuHidden li-877"><a class="menuA level1 menuHidden" href="https://go.openathens.net/redirector/gapines.org?url=https%3A%2F%2Finfoweb.newsbank.com%2Fapps%2Fnews%2Fuser%2Flibrarycard%2FMiddleGeorgiaRegionalLibrary%3Fdestination%3Dbrowse-pub%253Fp%253DNewsBank%2526t%253Dpubname%25253AMGAT-EEDT%252521Macon%25252BTelegraph%2525252C%25252BThe%25252B%25252528GA%25252529%2526action%253Dbrowse%2526year%253D2024" target="_new">The Macon Telegraph Digital Archives</a></li>
			<li class="menuLI level1 menuHidden li-1064"><a class="menuA level1 menuHidden" href="https://thepalaceproject.org/" target="_new">Palace Project App</a></li>
			<li class="menuLI level1 menuHidden li-850"><a class="menuA level1 menuHidden" href="https://proxy.openathens.net/login?qurl=https%3A%2F%2Fresearch.valueline.com%2FSecure%2FResearch%2FHome%23sec%3Dlibrary" target="_new">Value Line</a></li>
		</ul>
	</li>
	<li class="menuLI level0 menuDisplay li-188"><a class="menuA level0 menuDisplay" href="https://calendarwiz.com/mgrl" target="_new">Events</a></li>
	<li class="menuLI level0 menuDisplay li-836 children"><a class="menuA level0 menuDisplay" href="your_library_card/index.php" target="_self">Your Library Card</a>
		<ul class="menuUL level1 menuHidden ul-880">
			<li class="menuLI level1 menuHidden li-880"><a class="menuA level1 menuHidden" href="https://gapines.org/eg/opac/myopac/main" target="_new">My Account</a></li>
			<li class="menuLI level1 menuHidden li-881"><a class="menuA level1 menuHidden" href="https://gapines.org/eg/opac/register" target="_new">Sign Up/Renew</a></li>
		</ul>
	</li>
	<li class="menuLI level0 menuDisplay li-91 children"><a class="menuA level0 menuDisplay" href="information/index.php" target="_self">About Us</a>
		<ul class="menuUL level1 menuHidden ul-618">
			<li class="menuLI level1 menuHidden li-618"><a class="menuA level1 menuHidden" href="information/about_us/employment.php" target="_self">Employment Opportunities</a></li>
			<li class="menuLI level1 menuHidden li-118 children"><a class="menuA level1 menuHidden" href="information/faq.php" target="_self">FAQs</a>
				<ul class="menuUL level2 menuHidden ul-977">
					<li class="menuLI level2 menuHidden li-977"><a class="menuA level2 menuHidden" href="https://docs.google.com/forms/d/e/1FAIpQLSf3O7AU1s8XUSywQ4viUomD8tn1Gc7aPvc1mggH5FWrwP-19Q/viewform" target="_new">Recommend a Purchase Form</a></li>
					<li class="menuLI level2 menuHidden li-978"><a class="menuA level2 menuHidden" href="https://docs.google.com/forms/d/e/1FAIpQLSf2u5ZeUjn-1r6keTlIbLEBNuOjZQ9VfeG8ujRL4Tf2PbeBEQ/viewform" target="_new">Author Submission Form</a></li>
					<li class="menuLI level2 menuHidden li-979"><a class="menuA level2 menuHidden" href="Information/FAQ/MGRL Honor Memorial Book rev 9.29.2022.pdf" target="_new">Honor/Memorial Donation Form</a></li>
				</ul>
			</li>
			<li class="menuLI level1 menuHidden li-94 children"><a class="menuA level1 menuHidden" href="information/get_involved/index.php" target="_self">Get Involved</a>
				<ul class="menuUL level2 menuHidden ul-191">
					<li class="menuLI level2 menuHidden li-191"><a class="menuA level2 menuHidden" href="information/get_involved/give.php" target="_self">Give</a></li>
					<li class="menuLI level2 menuHidden li-192"><a class="menuA level2 menuHidden" href="information/get_involved/volunteer.php" target="_self">Volunteer</a></li>
					<li class="menuLI level2 menuHidden li-193"><a class="menuA level2 menuHidden" href="information/get_involved/friends_of_the_library.php" target="_self">Friends Of The Library</a></li>
				</ul>
			</li>
			<li class="menuLI level1 menuHidden li-123"><a class="menuA level1 menuHidden" href="information/history.php" target="_self">History</a></li>
			<li class="menuLI level1 menuHidden li-121"><a class="menuA level1 menuHidden" href="information/library_board_of_trustees.php" target="_self">Library Board Of Trustees</a></li>
			<li class="menuLI level1 menuHidden li-109 children"><a class="menuA level1 menuHidden" href="information/news/index.php" target="_self">News</a>
				<ul class="menuUL level2 menuHidden ul-115">
					<li class="menuLI level2 menuHidden li-115"><a class="menuA level2 menuHidden" href="information/news/report_to_the_community.php" target="_self">Report To The Community</a></li>
					<li class="menuLI level2 menuHidden li-110"><a class="menuA level2 menuHidden" href="information/news/rfps.php" target="_self">RFPs</a></li>
					<li class="menuLI level2 menuHidden li-114"><a class="menuA level2 menuHidden" href="https://bibblib.us11.list-manage.com/subscribe?u=7548d0057609359d13afc5428&id=933abcab9b" target="_new">Subscribe For E-Newsletter</a></li>
					<li class="menuLI level2 menuHidden li-113"><a class="menuA level2 menuHidden" href="https://us11.campaign-archive.com/home/?u=7548d0057609359d13afc5428&id=933abcab9b" target="_new">View Our E-Newsletter</a></li>
				</ul>
			</li>
			<li class="menuLI level1 menuHidden li-908"><a class="menuA level1 menuHidden" href="information/policies.php" target="_self">Policies</a></li>
			<li class="menuLI level1 menuHidden li-120"><a class="menuA level1 menuHidden" href="information/staff_directory.php" target="_self">Staff Directory</a></li>
		</ul>
	</li>
</ul>







			
    </nav>
	




	
</header>
<section id="slider" class="tiny-slider-wrap">
		<div class="rzEditWrap rzSliderBtns">
			<script language="JavaScript" type="text/JavaScript">
				RZ.module = 'slider';
				RZ.nexturl = "/revize/webgen_includes/georgia_library/editforms/slider-editlist.jsp?pageid=business_directory-17";
				RZ.popupwidth = ''; RZ.popupheight = ''; RZ.popupscroll = '';
				RZ.img = '<span class="rzBtn">Edit Slider</span>';
				RZ.caption = '';
				RZ.options = '';
				if (typeof RZaction != 'undefined') RZaction('editlist');
			</script>
			
		</div><!--/.rzEditWrap-->
<script language="JavaScript" type="text/JavaScript">
if (typeof RZlistbegin != 'undefined') RZlistbegin(1)
</script>
<script language="JavaScript" type="text/JavaScript">
if (typeof RZlinktemplate != 'undefined') RZlinktemplate('slider','','')
if (typeof RZ.nextseq != 'undefined') RZ.nextseq.modules['slider_1']={field:'seq_no',seq:'1.00'};
</script>

	<ul class="tiny-slider">
		<li class="tiny-item"><div class="tns-lazy-img tns-bg-slide" data-style="background:url('banners/slide-1.jpg') right center no-repeat;background-size:100%"></div></li>
	</ul><!--/.tiny-slider-->

</section><!--/#slider-->
<main id="main">
    <div class="container">            <div class="">
                <article id="entry">
					<nav id="breadcrumbs" aria-label="breadcrumb">
	<ul>
	
		<li><a href="./">Home</a></li>
							<li>&nbsp;<a href="locations_hours.php">Locations&nbsp;&&nbsp;Hours&nbsp;</a> </li>
							<li>Gordon Public Library</li>

	</ul>
</nav>

                    <h1 id="page-title"><strong></strong></h1>
                    <div id="post">
<div class="container">
	<div class="row">
		<div class="col-md-3">
			<div class="pull-left" style="margin-right:30px">
			 <div class="bus-detail">
				
					<span>
						<i class="fa fa-phone"></i>
						<a href="tel:4786285352">(478) 628-5352</a>
					</span>
				

				  
				  

				  
				  
				  <span><i class="fa fa-map-marker"></i>284 Milledgeville Highway West, Gordon, GA 31031-0336</span>
				  

				  
				  


				  
				  
			  </div><!--/.bus-detail-->
			
			<div class="leftnav-map">
			 <!-- Business Map Begins -->

			 <!-- Iframe embed -->
			<iframe class="rz-business-inner-map"
				  width="300"
				  height="350"
				  frameborder="0" style="border:1px solid #1f3c69"
				  src="https://www.google.com/maps/embed/v1/place?key=REDACTED_PUBLIC_EMBED_KEY&q=284+Milledgeville+Highway+West+Gordon+GA+31031-0336 " allowfullscreen>
			 </iframe>
			

			 </div>
			</div>
		</div>
		<div class="col-md-9"><div class="rzEditWrap">
		<script language="JavaScript" type="text/JavaScript">
			RZ.module = 'freeform';
			RZ.recordid = '';
			RZ.nexturl = "/revize/webgen_includes/georgia_library/editforms/freeform-editform.jsp";
			RZ.popupwidth = ''; RZ.popupheight = ''; RZ.popupscroll = '';
			RZ.img = '<span class="rzBtn">Edit Page Content</span>';
			RZ.set = 'freeform.pageid=business_directory-17';
			RZ.options = '';
			if (typeof RZaction != 'undefined') RZaction('editform');
		</script>
	
	<script language="JavaScript" type="text/JavaScript">
		RZ.module = 'freeform';
		RZ.recordid = '';
		RZ.nexturl = "/revize/webgen_includes/georgia_library/editforms/metadata-editform.jsp";
		RZ.popupwidth = ''; RZ.popupheight = ''; RZ.popupscroll = '';
		RZ.img = '<span class="rzBtn">Edit Metadata</span>';
		RZ.set = 'freeform.pageid=business_directory-17';
		RZ.options = '';
		if (typeof RZaction != 'undefined') RZaction('editform');
	</script>
	<script language="JavaScript" type="text/JavaScript">
		RZ.nexturl = '';
		RZ.img = '<img src="images/edit/permissions.jpg" alt="Permissions" border="0" />';
		RZ.options = '';
		if (typeof RZaction != 'undefined') RZaction('permissions');
	</script>
</div>


<div class="clearfix">
	<div style="text-align: center;">
<table style="border-collapse: collapse; width: 100%;" border="0">
<tbody>
<tr>
<td style="width: 10.9356%; text-align: center;">
<h4><span class="subheader">HOURS OF OPERATION:<br /></span></h4>
</td>
<td style="width: 14.0109%; text-align: center;">
<h4><span class="subheader">BRANCH MANAGER</span></h4>
</td>
<td style="width: 15.9083%; text-align: center;">
<h4><span class="subheader"><br />UPCOMING EVENTS AT THIS LIBRARY</span></h4>
</td>
</tr>
<tr>
<td style="width: 10.9356%; text-align: center;">Monday-Friday: 9:00 am - 6:00 pm</td>
<td style="width: 14.0109%; text-align: center;">Kayla King</td>
<td style="width: 15.9083%; text-align: center;">&nbsp;<a href="https://www.calendarwiz.com/calendars/week.php?crd=mgrl&amp;cid%5B%5D=empty&amp;lid%5B%5D=412809&amp;" target="_blank">View Events</a></td>
</tr>
</tbody>
</table>
</div>
</div>
			</div>
		</div>
	</div>

                    </div><!--/#post-->                </article><!--/#entry-->
            </div><!--/.col-lg-9-->

    </div><!--/.container-->
	



    <section id="holiday">
        <div class="container">
            <div class="row">
                <div class="col-lg">
                    <div id="holiday-left" class="equal">                        <h2><strong>Get Involved</strong></h2>
                        <div id="holiday-caption">
                            
                        </div><!--/#holiday-caption-->
                        <div id="holiday-links">

							<a href="information/get_involved/give.php" target="_self" class="button arrow">Give <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="20px" height="20px"><path fill-rule="evenodd" fill="rgb(255, 255, 255)" d="M19.996,1.023 C19.996,1.024 19.998,1.025 19.998,1.027 L19.998,14.990 C19.998,15.543 19.548,15.989 18.993,15.989 C18.438,15.989 17.988,15.543 17.988,14.990 L17.988,3.396 L1.669,19.715 C1.286,20.097 0.665,20.097 0.282,19.715 C-0.101,19.332 -0.101,18.711 0.282,18.328 L16.601,2.008 L5.008,2.008 C4.456,2.008 4.008,1.559 4.008,1.003 C4.008,0.449 4.456,-0.001 5.008,-0.001 L19.000,-0.001 C19.553,-0.001 19.1000,0.449 19.1000,1.003 C19.1000,1.010 19.996,1.016 19.996,1.023 Z"/></svg></a>
		
							<a href="information/get_involved/volunteer.php" target="_self" class="button arrow">Volunteer <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="20px" height="20px"><path fill-rule="evenodd" fill="rgb(255, 255, 255)" d="M19.996,1.023 C19.996,1.024 19.998,1.025 19.998,1.027 L19.998,14.990 C19.998,15.543 19.548,15.989 18.993,15.989 C18.438,15.989 17.988,15.543 17.988,14.990 L17.988,3.396 L1.669,19.715 C1.286,20.097 0.665,20.097 0.282,19.715 C-0.101,19.332 -0.101,18.711 0.282,18.328 L16.601,2.008 L5.008,2.008 C4.456,2.008 4.008,1.559 4.008,1.003 C4.008,0.449 4.456,-0.001 5.008,-0.001 L19.000,-0.001 C19.553,-0.001 19.1000,0.449 19.1000,1.003 C19.1000,1.010 19.996,1.016 19.996,1.023 Z"/></svg></a>
		
							<a href="information/get_involved/friends_of_the_library.php" target="_self" class="button arrow">Friends of the Library <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="20px" height="20px"><path fill-rule="evenodd" fill="rgb(255, 255, 255)" d="M19.996,1.023 C19.996,1.024 19.998,1.025 19.998,1.027 L19.998,14.990 C19.998,15.543 19.548,15.989 18.993,15.989 C18.438,15.989 17.988,15.543 17.988,14.990 L17.988,3.396 L1.669,19.715 C1.286,20.097 0.665,20.097 0.282,19.715 C-0.101,19.332 -0.101,18.711 0.282,18.328 L16.601,2.008 L5.008,2.008 C4.456,2.008 4.008,1.559 4.008,1.003 C4.008,0.449 4.456,-0.001 5.008,-0.001 L19.000,-0.001 C19.553,-0.001 19.1000,0.449 19.1000,1.003 C19.1000,1.010 19.996,1.016 19.996,1.023 Z"/></svg></a>
		
                        </div><!--/#holiday-links-->
                    </div><!--/#holiday-left.equal-->
                </div><!--/.col-lg-->
                <div class="col-lg">                    <div id="holiday-right" class="fillRight withPadding equal" style="background:url('_assets_/images/holiday-bg.jpg') center no-repeat;background-size:cover"></div>
                </div><!--/.col-lg-->
            </div><!--/.row-->
        </div><!--/.container-->
    </section><!--/#holiday-->
</main><!--/#main-->
<section id="modal-section">
		<button type="button" class="share-btn floating-share-btn" data-toggle="modal" data-target="#shareModal" >
		<i class="fa fa-share-alt"></i>
		<span>Share <span class="sr-only">this page</span></span>
	</button>

	<div class="modal fade" id="shareModal" tabindex="-1" role="dialog" aria-labelledby="shareModal">
		<div class="modal-dialog modal-lg" role="document">
			<div class="modal-content">
				<div class="modal-header">
					<h2 class="modal-title" id="myModalLabel">Share this page</h2>
					<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
				</div>
				<div class="modal-body">
					<div class="copylink">
						<p>Copy and paste this code into your website.</p>
						<pre class="py-3 px-4">&lt;a href="http://bibblib.org/directory_page_T49_R17.php">Your Link Name&lt;/a&gt;</pre>
					</div><!-- /.copylink -->
					<div class="share-btns">
						<p>Share this page on your favorite Social network</p>
						<div class="row">
							<div class="col-sm-4">
								<a href="https://www.facebook.com/sharer/sharer.php?u=http://bibblib.org/directory_page_T49_R17.php" class="btn-facebook" onclick="return !window.open(this.href, 'facebook ', 'width=500,height=500')"
								target="_blank">
									<i class="fab fa-facebook"></i> Facebook
								</a>
							</div>
							<div class="col-sm-4">
								<a href="https://www.twitter.com/intent/tweet?url=http://bibblib.org/directory_page_T49_R17.php" class="btn-twitter" onclick="return !window.open(this.href, 'twitter ', 'width=500,height=500')"
								target="_blank">
									<i class="fab fa-twitter"></i> Twitter
								</a>
							</div>
							<div class="col-sm-4">
								<a href="https://www.reddit.com/submit?url=http://bibblib.org/directory_page_T49_R17.php" class="btn-reddit" onclick="return !window.open(this.href, 'redit ', 'width=500,height=500')"
								target="_blank">
									<i class="fab fa-reddit"></i> Reddit
								</a>
							</div>
						</div><!-- /.row -->
					</div><!-- /.share-btns -->
					<button type="button" class="btn btn-success btn-lg" data-dismiss="modal">Close</button>
				</div><!-- /.modal-body -->
			</div>
		</div><!-- /.modal-dialog -->
	</div><!-- /.modal -->
</section><!-- /#modal-section -->

<script>
    (function(d){
      var s = d.createElement("script");
      /* uncomment the following line to override default position*/
      s.setAttribute("data-position", 5);
      /* uncomment the following line to override default size (values: small, large)*/
      /* s.setAttribute("data-size", "small");*/
      /* uncomment the following line to override default language (e.g., fr, de, es, he, nl, etc.)*/
      /* s.setAttribute("data-language", "language");*/
      /* uncomment the following line to override color set via widget (e.g., #053f67)*/
      /* s.setAttribute("data-color", "#053e67");*/
      /* uncomment the following line to override type set via widget (1=person, 2=chair, 3=eye, 4=text)*/
      /* s.setAttribute("data-type", "1");*/
      /* s.setAttribute("data-statement_text:", "Our Accessibility Statement");*/
      /* s.setAttribute("data-statement_url", "http://www.example.com/accessibility")";*/
      /* uncomment the following line to override support on mobile devices*/
      /* s.setAttribute("data-mobile", true);*/
      /* uncomment the following line to set custom trigger action for accessibility menu*/
      /* s.setAttribute("data-trigger", "triggerId")*/
      s.setAttribute("data-account", "3Ev94fQ0mg");
      s.setAttribute("src", "https://cdn.userway.org/widget.js");
      (d.body || d.head).appendChild(s);
    })(document)
</script>

<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-6Y3KHVP51W"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-6Y3KHVP51W');
</script><footer id="main-footer">
	
	
	<div class="container text-center">		<h2><strong>MIDDLE&#160; GEORGIA&#160; REGIONAL&#160; LIBRARY</strong></h2>
		<div>
			<p>MIDDLE &nbsp;GEORGIA &nbsp;REGIONAL &nbsp;LIBRARY<br /><a href="https://goo.gl/maps/z48bbt2bJNTDxAJD7" target="_blank">1180 Washington Ave</a><br />Macon, GA 31201</p>
		</div>
        <div class="smls">
            
                <a aria-label="facebook" href="https://www.facebook.com/MGRLibraries/" target="_blank" class="fab fa-facebook-f sml" style="color:#61aa45"></a>
            
                <a aria-label="instagram" href="https://www.instagram.com/MGRLibraries/" target="_blank" class="fab fa-instagram sml" style="color:#61aa45"></a>
            
                <a aria-label="twitter" href="https://twitter.com/MGRLibraries" target="_blank" class="fab fa-twitter sml" style="color:#61aa45"></a>
            
        </div><!--/.smls-->
        <ul class="translation-links">
            <li><button type="button" class="translate-button" aria-label="translate page" aria-haspopup="true" aria-expanded="false">Translate page <i class="fa fa-caret-up"></i></button>
                <ul class="clearfix">
                    <li><a href="#" class="English" data-lang="English"><strong translate="no">English</strong></a></li>
                    <li><a href="#" class="Afrikaans" data-lang="Afrikaans">Afrikaans</a></li>
                    <li><a href="#" class="Albanian" data-lang="Albanian">Albanian</a></li>
                    <li><a href="#" class="Arabic" data-lang="Arabic">Arabic</a></li>
                    <li><a href="#" class="Armenian" data-lang="Armenian">Armenian</a></li>
                    <li><a href="#" class="Azerbaijani" data-lang="Azerbaijani">Azerbaijani</a></li>
                    <li><a href="#" class="Basque" data-lang="Basque">Basque</a></li>
                    <li><a href="#" class="Belarusian" data-lang="Belarusian">Belarusian</a></li>
                    <li><a href="#" class="Bengali" data-lang="Bengali">Bengali</a></li>
                    <li><a href="#" class="Bosnian" data-lang="Bosnian">Bosnian</a></li>
                    <li><a href="#" class="Bulgarian" data-lang="Bulgarian">Bulgarian</a></li>
                    <li><a href="#" class="Catalan" data-lang="Catalan">Catalan</a></li>
                    <li><a href="#" class="Cebuano" data-lang="Cebuano">Cebuano</a></li>
                    <li><a href="#" class="Chinese" data-lang="Chinese (Simplified)">Chinese (Simplified)</a></li>
                    <li><a href="#" class="Chinese" data-lang="Chinese (Traditional)">Chinese (Traditional)</a></li>
                    <li><a href="#" class="Croatian" data-lang="Croatian">Croatian</a></li>
                    <li><a href="#" class="Czech" data-lang="Czech">Czech</a></li>
                    <li><a href="#" class="Danish" data-lang="Danish">Danish</a></li>
                    <li><a href="#" class="Dutch" data-lang="Dutch">Dutch</a></li>
                    <li><a href="#" class="Esperanto" data-lang="Esperanto">Esperanto</a></li>
                    <li><a href="#" class="Estonian" data-lang="Estonian">Estonian</a></li>
                    <li><a href="#" class="Filipino" data-lang="Filipino">Filipino</a></li>
                    <li><a href="#" class="Finnish" data-lang="Finnish">Finnish</a></li>
                    <li><a href="#" class="French" data-lang="French">French</a></li>
                    <li><a href="#" class="Galician" data-lang="Galician">Galician</a></li>
                    <li><a href="#" class="Georgian" data-lang="Georgian">Georgian</a></li>
                    <li><a href="#" class="German" data-lang="German">German</a></li>
                    <li><a href="#" class="Greek" data-lang="Greek">Greek</a></li>
                    <li><a href="#" class="Gujarati" data-lang="Gujarati">Gujarati</a></li>
                    <li><a href="#" class="Haitian Creole" data-lang="Haitian Creole">Haitian Creole</a></li>
                    <li><a href="#" class="Hausa" data-lang="Hausa">Hausa</a></li>
                    <li><a href="#" class="Hebrew" data-lang="Hebrew">Hebrew</a></li>
                    <li><a href="#" class="Hindi" data-lang="">Hindi</a></li>
                    <li><a href="#" class="Hmong" data-lang="Hmong">Hmong</a></li>
                    <li><a href="#" class="Hungarian" data-lang="Hungarian">Hungarian</a></li>
                    <li><a href="#" class="Icelandic" data-lang="Icelandic">Icelandic</a></li>
                    <li><a href="#" class="Igbo" data-lang="Igbo">Igbo</a></li>
                    <li><a href="#" class="Indonesian" data-lang="Indonesian">Indonesian</a></li>
                    <li><a href="#" class="Irish" data-lang="Irish">Irish</a></li>
                    <li><a href="#" class="Italian" data-lang="Italian">Italian</a></li>
                    <li><a href="#" class="Japanese" data-lang="Japanese">Japanese</a></li>
                    <li><a href="#" class="Javanese" data-lang="Javanese">Javanese</a></li>
                    <li><a href="#" class="Kannada" data-lang="Kannada">Kannada</a></li>
                    <li><a href="#" class="Khmer" data-lang="Khmer">Khmer</a></li>
                    <li><a href="#" class="Korean" data-lang="Korean">Korean</a></li>
                    <li><a href="#" class="Lao" data-lang="Lao">Lao</a></li>
                    <li><a href="#" class="Latin" data-lang="Latin">Latin</a></li>
                    <li><a href="#" class="Latvian" data-lang="Latvian">Latvian</a></li>
                    <li><a href="#" class="Lithuanian" data-lang="Lithuanian">Lithuanian</a></li>
                    <li><a href="#" class="Macedonian" data-lang="Macedonian">Macedonian</a></li>
                    <li><a href="#" class="Malay" data-lang="Malay">Malay</a></li>
                    <li><a href="#" class="Maltese" data-lang="Maltese">Maltese</a></li>
                    <li><a href="#" class="Maori" data-lang="Maori">Maori</a></li>
                    <li><a href="#" class="Marathi" data-lang="Marathi">Marathi</a></li>
                    <li><a href="#" class="Mongolian" data-lang="Mongolian">Mongolian</a></li>
                    <li><a href="#" class="Nepali" data-lang="Nepali">Nepali</a></li>
                    <li><a href="#" class="Norwegian" data-lang="Norwegian">Norwegian</a></li>
                    <li><a href="#" class="Persian" data-lang="Persian">Persian</a></li>
                    <li><a href="#" class="Polish" data-lang="Polish">Polish</a></li>
                    <li><a href="#" class="Portuguese" data-lang="Portuguese">Portuguese</a></li>
                    <li><a href="#" class="Punjabi" data-lang="Punjabi">Punjabi</a></li>
                    <li><a href="#" class="Romanian" data-lang="Romanian">Romanian</a></li>
                    <li><a href="#" class="Russian" data-lang="Russian">Russian</a></li>
                    <li><a href="#" class="Serbian" data-lang="Serbian">Serbian</a></li>
                    <li><a href="#" class="Slovak" data-lang="Slovak">Slovak</a></li>
                    <li><a href="#" class="Slovenian" data-lang="Slovenian">Slovenian</a></li>
                    <li><a href="#" class="Somali" data-lang="Somali">Somali</a></li>
                    <li><a href="#" class="Spanish" data-lang="Spanish">Spanish</a></li>
                    <li><a href="#" class="Swahili" data-lang="Swahili">Swahili</a></li>
                    <li><a href="#" class="Swedish" data-lang="Swedish">Swedish</a></li>
                    <li><a href="#" class="Tamil" data-lang="Tamil">Tamil</a></li>
                    <li><a href="#" class="Telugu" data-lang="Telugu">Telugu</a></li>
                    <li><a href="#" class="Thai" data-lang="Thai">Thai</a></li>
                    <li><a href="#" class="Turkish" data-lang="Turkish">Turkish</a></li>
                    <li><a href="#" class="Ukrainian" data-lang="Ukrainian">Ukrainian</a></li>
                    <li><a href="#" class="Urdu" data-lang="Urdu">Urdu</a></li>
                    <li><a href="#" class="Vietnamese" data-lang="Vietnamese">Vietnamese</a></li>
                    <li><a href="#" class="Welsh" data-lang="Welsh">Welsh</a></li>
                    <li><a href="#" class="Yiddish" data-lang="Yiddish">Yiddish</a></li>
                    <li><a href="#" class="Yoruba" data-lang="Yoruba">Yoruba</a></li>
                    <li><a href="#" class="Zulu" data-lang="Zulu">Zulu</a></li>
                </ul>
            </li>
        </ul><!--/.translation-links-->
        <nav id="footer-links" aria-label="Footer Links"><!--#footer-links-->
            <ul>
                            
            </ul>
        </nav><!--/#footer-links-->
        <div id="copyright">
            &copy; 2026 Middle Georgia Regional Library <span>&#x2022;</span> Powered by <a aria-label="Revize The Government Website Experts" href="https://www.revize.com" target="_blank" id="revize-link" style="text-decoration: underline;">revize.</a>, the Government Website Experts <span>&#x2022;</span> <a id="revize-login" href="https://webgen1.revize.com/revize/security/index.jsp?webspace=middlegeorgialibraryga&filename=/directory_page_T49_R17.php">Login</a>
        </div><!--/#copyright-->
    </div><!--/.container.text-center-->
</footer>

<script src="_assets_/plugins/modernizr/modernizr.custom.js"></script>
<script src="_assets_/plugins/tiny-slider/dist/min/tiny-slider.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/js/bootstrap.bundle.min.js" integrity="sha384-Piv4xVNRyMGpqkS2by6br4gNJ7DXjqk09RmUpJ8jgGtD7zP9yug3goQfGII0yAns" crossorigin="anonymous"></script>

	<script type="text/javascript" src="/revize/plugins/general_directory/includes/business-directory-scripts.js"></script>
<div class="modal fade" id="event-modal" tabindex="-1" role="dialog" aria-labelledby="event-modal" aria-hidden="true">
  <div id="event-modal-dialog" class="modal-dialog modal-dialog-centered" role="document">
    <div class="modal-content">
	  <div class="event-modal-header">
		  <div class="modal-event-date-wrap">
			<span class="modal-event-date-number"></span>
			<span class="modal-event-date-month"></span>
		  </div>
      </div>
	  <div class="modal-body" id="modal-event-body">
		 <h2 class="modal-title" id="modal-event-title"></h2>
		 <h3 class="modal-subtitle" id="modal-event-subtitle"></h3>
		 <div class="modal-description clearfix" id="modal-event-description"></div>
		 <div class="modal-location" id="modal-event-location"></div>
	  </div>
      <div class="modal-footer">
        <button id="modal-close-button" type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
        <a href="#" id="modal-event-readmore" class="btn btn-primary">Read More</a>
      </div>
    </div>
  </div>
</div>
<script src="/revize/plugins/revize_calendar/moment.min.js"></script>
<script src="/revize/plugins/revize_calendar/moment-timezone.min.js"></script>
<script src="/revize/plugins/revize_calendar/rrule.js"></script>
<script src="/revize/plugins/revize_calendar/ical.min.js"></script>
<script src="/revize/plugins/revize_calendar/core/main.min.js"></script>
<script src="/revize/plugins/revize_calendar/google-calendar/main.min.js"></script>
<script src="/revize/plugins/revize_calendar/rrule/main.min.js"></script>
<script src="/revize/plugins/revize_calendar/list/main.min.js"></script>
<script src="/revize/plugins/revize_calendar/daygrid/main.min.js"></script>
<script src="/revize/plugins/revize_calendar/timegrid/main.min.js"></script>
<script src="/revize/plugins/revize_calendar/doT.min.js"></script>
<script src="/revize/plugins/revize_calendar/ics/ics.deps.min.js"></script>
<script src="/revize/plugins/revize_calendar/mini.js"></script>

<script src="_assets_/plugins/matchHeight/dist/jquery.matchHeight-min.js"></script>
<script src="_assets_/js/scripts.js?t=1689779283330"></script>





</body>
</html>

