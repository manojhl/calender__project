// TODO's 
// 08. Validating startTime and endTime
// 13. edge case: when event duration is more than 24hours or 
//     if the event lies in more than two days
// 15. periodically update the .event__duration
// 16. write a function to handle setInterval (and delay using setTimeout) 
// 17. use moment.js where ever possible(renderEvents) to increase 
//     performance [ISSUE - with moment.js month starts with 1 i,e january]

var renderData 			= [],
		renderDateTime 	= new Date(),
		renderDate 			= renderDateTime.getDate(),
		renderMonth 		= renderDateTime.getMonth(),
		renderYear 			= renderDateTime.getFullYear(),
		/* 17.	with moment	
		renderDateTime 	= moment(),
		renderDate 			= renderDateTime.format('D'),
		renderMonth 		= renderDateTime.format('M'),
		renderYear 			= renderDateTime.format('YYYY'),
		*/
		$eventsHolder 	= $('#events'),
		$currentTimeMarker = '';

// Generate the view
function init() {
	
	// make the ajax call and get the data
	getData();

	// get current marker up
	currentTimeMarker();
	
	// initiate time_labels
	var $html = '';
	for(var hour = 0; hour < 24; hour++) {
		$html += "<div class='time__label'><div>" + moment().set('hour', hour).format('h A') + "</div></div>";
	}
	$('#time_lable').html($html);

	// initiate time_line
	$html = "<div class='hour_markers_holder'>";
	for(var hour = 0; hour < 24; hour++) {
		$html += "<div class='hour_markers'></div>";
	}
	$html += "</div>";
	$('#markers').html($html);	
}

// get and prepare data
function getData() {
	$.ajax({
		url: './sample-data.json' ,
		type: 'get',
		dataType: 'json',
		success: function( data ) {
			renderData = data;
			renderEvents( renderData );
		}
	});
}

// render calender events handler
function renderEvents( data ) {
	var dataIn  = data || renderData,
			dataInLenght = dataIn.length,
			currentDate = renderDateTime.getDate(),
			renderMonth = renderDateTime.getMonth(),
			event = {};

	$('#renderDateTime').html(moment(renderDateTime).format("dddd, MMMM DD YYYY"));

	// clear exiting events
	$eventsHolder.find('.event').remove();
	

	// Use good old over for..in for itirating array
	// http://stackoverflow.com/questions/1963102/
	for(var index = 0; index < dataInLenght ; index++) {
		var givenEvent 		= dataIn[index],
				startDateTime = new Date(givenEvent.startTime),
				endDateTime 	= new Date(givenEvent.endTime),
				startMonth 		= startDateTime.getMonth(),
				startDate 		= startDateTime.getDate(),
				startYear 		= startDateTime.getFullYear(),
				endMonth 			= endDateTime.getMonth(),
				endDate 			= endDateTime.getDate(),
				endYear 			= endDateTime.getFullYear();
				
		// filter events only from current month and date
		/*
		(renderYear === (startYear || endYear)) && (renderMonth === (startMonth || endMonth)) &&  (currentDate === (endDate || startDate))
		this is slower than the below one
		*/
		if( (renderYear === startYear && renderMonth === startMonth && currentDate === startDate ) || (renderYear === endYear && renderMonth === endMonth && currentDate === endDate) ) {

			event.id 		= givenEvent.title.replace(' ', '-');
			event.title = givenEvent.title;

			event.startDateTime = moment(startDateTime).format('ddd, D-MM-YYYY h:mm:ss A');
			event.endDateTime 	= moment(endDateTime).format('ddd, D-MM-YYYY h:mm:ss A');

			event.startTime = moment(startDateTime).format('hh:mm A');
			event.endTime 	= moment(endDateTime).format('hh:mm A');			

			event.duration = {
				hours 	: moment(endDateTime).diff(startDateTime, 'hours'),
				minutes : moment(endDateTime).diff(startDateTime, 'minute') % 60
			};

			// get 
			if( moment().isAfter(startDateTime) ) {
				if( moment().isAfter(endDateTime) ) {
					event.fromNow = moment(endDateTime).fromNow();
				} else {
					event.fromNow = 'Happening';
				}
			} else {
				event.fromNow = 'is ' + moment(startDateTime).fromNow();
			}

			// @TODO 13. edge case: when event duration is more than 24hours
			// finding if the event lies in more than one days
			if( startDate !== endDate ) {
				if( renderDate === startDate ) {
					event.offset = createEvent(givenEvent.startTime);
					event.height = 1440 - createEvent(givenEvent.startTime);
				} else {
					event.offset = 0;
					event.height = createEvent(givenEvent.endTime);
				}
			} else {
				
				event.offset = createEvent(givenEvent.startTime);
				event.height = createEvent(givenEvent.endTime) - createEvent(givenEvent.startTime);	
			}
			// render the event
			eventTemplate(event);
		}
	}

	// check for event collisions
	collisionCheck();

	// render time marker if the renderDate is equal to current date
	if(renderMonth === getCurrentDateTime('month') && renderDate === getCurrentDateTime('date')) {
		$currentTimeMarker.show();
	} else {
		$currentTimeMarker.hide();
	}
}

function eventTemplate( event ) {
	var $html = '';
	
	$html += "<div id='"+ event.id +"' class='event event__raised' style='width: 99%; top:"+ event.offset +"px;' title='"+ event.startDateTime + " - "+ event.endDateTime +"'>";
	$html += "<div style='height:" + event.height + "px'>";
	$html += event.title;

	$html += " <span class='event__time'> &nbsp;[";
	$html += event.startTime + ' - ' + event.endTime;
	$html += "] &nbsp;</span>";

	$html += " <span class='event__duration'> Duration: ";
	var hours = event.duration.hours;
	if( hours ) {
		$html += hours;
		$html += (hours <= 1) ? ' hour ' : ' hours ';
	}
	var minutes = event.duration.minutes;
	if( minutes ) {
		$html += minutes;
		$html += (minutes <= 1) ? ' minute ' : ' minutes ';
	}
	$html += "</span>";

	if( event.fromNow ) {
		$html += " <span class='event__fromnow'> &nbsp;(";
		$html += event.fromNow;
		$html += ") &nbsp;</span>";
	}

	$html += " <span class='event__hidden'> &nbsp;(";
	$html += event.startDateTime + " - "+ event.endDateTime;
	$html += ") &nbsp;</span>";
	

	$html += "</div>";
	$html += "</div>";

	$eventsHolder.append($html);
}

// current time marker
// @TODO use workers to inprove performance
function currentTimeMarker() {
	var currentHour   = getCurrentDateTime('hours'),
			currentMinute = getCurrentDateTime('minutes'),
			offset				= (currentHour * 60) + currentMinute;

	if(!$currentTimeMarker.length) {
		$eventsHolder.append("<div id='currentTimeMarker' style='top: "+ offset +"px'></div>");
		$currentTimeMarker = $('#currentTimeMarker');
	} else {
		$currentTimeMarker.css({top:offset + 'px'});
	}
}

// Utility
// ===========================================

// Get current date, month, hours, minutes
function getCurrentDateTime( arg ) {
	var type = arg || '',
			currentDateTime = new Date();

	switch(type.toLowerCase()) {
		case 'date': 
			return currentDateTime.getDate();
		case 'month': 
			return currentDateTime.getMonth();
		case 'hour': 
		case 'hours': 
			return currentDateTime.getHours();
		case 'minute': 
		case 'minutes': 
			return currentDateTime.getMinutes();
		// @TODO case 'time':
		// @TODO case 'datetime':
		default:
		 	return currentDateTime;
	}
}

// use setinterval to trigger currentTimeMarker once in 60s
window.setInterval(function() {currentTimeMarker();}, 60000);

// update render global variables
// @TODO change the date argument to moment object and handle accordingly
function updateRenderDateTime( date ) {
	renderDateTime 	= new Date(renderYear, renderMonth, date);
	renderDate 			= renderDateTime.getDate();
	renderMonth 		= renderDateTime.getMonth();
	renderYear 			= renderDateTime.getFullYear();

	// triger renderEvents when renderDateTime updates
	renderEvents();
}

// rename or remove this function
function createEvent( date ) {
	var currentDate   = new Date(date) || new Date(),
			currentHour   = currentDate.getHours(),
			currentMinute = currentDate.getMinutes();

	return (currentHour * 60) + currentMinute;
}

// handle event ovelapping
function collisionCheck() {
	
	var $events = $eventsHolder.find('.event');

	for(var i = 0; i < $events.length; i++) {
		for(var j = (i+1); j < ($events.length); j++) {
				
			var rect1 = $events[i].getBoundingClientRect(),
					rect2 = $events[j].getBoundingClientRect(),
					overlap = !(rect1.right < rect2.left || 
			                rect1.left > rect2.right || 
			                rect1.bottom < rect2.top || 
			                rect1.top > rect2.bottom),
					event1Style = $events[i].style,
					event2Style = $events[j].style,
					event1Width = parseInt(event1Style.width),
					event2Width = parseInt(event2Style.width);

			if(overlap) {
				// console.log(event1Width, event2Width);
				
				if( event1Width < 50 || event2Width < 50 ) {
					
					event2Style.left = ( (event1Width/1.2) - 1) + '%';
					event2Style.width = event2Width/2 + '%';
					console.log(event1Width, event2Width);
				} else {
					
					// 
					event2Style.left = ( (event1Width/2) - 1) + '%';
					// change the width to 50%
					event1Style.width = event1Width/2 + '%';
					event2Style.width = event2Width/2 + '%';
					// console.log(event1Width, event2Width);
					// console.log(event1Style.width, event2Style.width);
				}
			}
		}
	}
}

// register events
// 17. migrating to moment library
// =================================
// today button
$('#today').on('click', function() {
	updateRenderDateTime( moment().format('D') );
	// updateRenderDateTime( moment( renderDateTime ) );
});

// previous button
$('#previous_day').on('click', function() {
	updateRenderDateTime( renderDate - 1 );
	// updateRenderDateTime( moment( renderDateTime ).subtract( 1, 'day' ) );
});

// next button
$('#next_day').on('click', function() {
	updateRenderDateTime( renderDate + 1 );
	// updateRenderDateTime( moment( renderDateTime ).add( 1, 'day' ) );
});


// initialize everything
init();





