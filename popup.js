var timeoutId = null;

function getGmailUrl() {
  return "https://mail.google.com/mail/";
}

// Identifier used to debug the possibility of multiple instances of the
// extension making requests on behalf of a single user.
function getInstanceId() {
  if (!localStorage.hasOwnProperty("instanceId"))
    localStorage.instanceId = 'gmc' + parseInt(Date.now() * Math.random(), 10);
  return localStorage.instanceId;
}

function getFeedUrl() {
  // "zx" is a Gmail query parameter that is expected to contain a random
  // string and may be ignored/stripped.
  return getGmailUrl() + "feed/atom?zx=" + encodeURIComponent(getInstanceId());
}

function renderStatus(statusText) {
  document.getElementById('status').textContent = statusText;
}

function gmailNSResolver(prefix) {
  if(prefix == 'gmail') {
    return 'http://purl.org/atom/ns#';
  }
}

function handleNotiUserResponse(resp) {
}

function showCurrentUnreadCount() {
	var xhr = new XMLHttpRequest();
	
  try {
    xhr.onreadystatechange = function() {
      if (xhr.readyState != 4)
        return;
	
		renderStatus("Got response...");
      if (xhr.responseXML) {
        var xmlDoc = xhr.responseXML;
		renderStatus("Evaluating response...");
        var fullCountSet = xmlDoc.evaluate("/gmail:feed/gmail:fullcount",
            xmlDoc, gmailNSResolver, XPathResult.ANY_TYPE, null);
		renderStatus("Found node...");
        var fullCountNode = fullCountSet.iterateNext();
		renderStatus("Found full count node...");
        if (fullCountNode) {
          renderStatus("Unread mail count:" + fullCountNode.textContent);
		  notifyUserEx(fullCountNode.textContent);
          return;
        } else {
			renderStatus(chrome.i18n.getMessage("gmailcheck_node_error"));
          console.error(chrome.i18n.getMessage("gmailcheck_node_error"));
        }
      } else {
		renderStatus("No response...");
	  }
    };

    xhr.onerror = function(error) {
      renderStatus("Error while fetching email unread count.");
    };

	renderStatus("Sending request...");
    xhr.open("GET", getFeedUrl(), true);
    xhr.send(null);
  } catch(e) {
    console.error(chrome.i18n.getMessage("gmailcheck_exception", e));
    renderStatus("Error :" + e);
  }
}

function notifyUser(count) {
  if (Notification.permission !== "granted")
    Notification.requestPermission();
  else {
    var notification = new Notification('Unread count', {
      icon: 'http://cdn.sstatic.net/stackexchange/img/logos/so/so-icon.png',
      body: "Total unread messages : " + count,
    });

    notification.onclick = function () {
    };

  }

}

var myNotificationID = null;

function notifyUserEx(count) {
    chrome.notifications.create("", {
        type:    "basic",
        iconUrl: "icon.png",
        title:   "REMINDER",
        message: "Unread count:" + count + ", <a href='#fgf'>Read more</a>",
        contextMessage: "It's about time...<a href='javascript:void(0)'>Read more</a>",
        buttons: [{
            title: "Move to 'bugzilla'?",
            iconUrl: "icon.png"
        }, {
            title: "Close",
            iconUrl: "icon.png"
        }]
    }, function(id) {
        myNotificationID = id;
    });
}

/* Respond to the user's clicking one of the buttons */
chrome.notifications.onButtonClicked.addListener(function(notifId, btnIdx) {
    if (notifId === myNotificationID) {
        if (btnIdx === 0) {
            chrome.notifications.clear(notifId, null);
        } else if (btnIdx === 1) {
			chrome.notifications.clear(notifId, null);
			if (timeoutId) {
				chrome.alarms.clear('watchdog');
			}
        }
    }
});

/* Add this to also handle the user's clicking 
 * the small 'x' on the top right corner */
chrome.notifications.onClosed.addListener(function() {
});

function onAlarm(alarm) {
  // |alarm| can be undefined because onAlarm also gets called from
  // window.setTimeout on old chrome versions.
  if (alarm && alarm.name == 'watchdog') {
    showCurrentUnreadCount();
  } else {
	  // nothing as of now
  }
}

chrome.alarms.onAlarm.addListener(onAlarm);

document.addEventListener('DOMContentLoaded', function() {
  if (!Notification) {
    alert('Desktop notifications not available in your browser. Try Chromium.'); 
    return;
  }

  if (Notification.permission !== "granted") {
    Notification.requestPermission();
  }
  
  if (timeoutId === null) {
	chrome.alarms.create('watchdog', {periodInMinutes:1});
  }
	
	renderStatus("Fetching Gmail feed...");
	showCurrentUnreadCount();
});