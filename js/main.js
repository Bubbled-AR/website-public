/***********************************************
* Loading gif
***********************************************/
$(window).on('load', function() {
	setTimeout(function () {
		$(".loading").fadeOut("slow");
	}, 100);
});

/* Presale - load ASAP before document ready */
if ($('#presale').length) {
	function enableRegButton() { regButton.removeAttr('disabled'); }
	function disableRegButton() { regButton.attr('disabled', true); }
	function loadCaptcha() {
		grecaptcha.render('captcha', {
			'sitekey' : '6Ld70DwUAAAAAO18dMOozH5HM2hZWBlwCS7s-1wa',
			'callback': enableRegButton,
			'expired-callback': disableRegButton
		});
	}
	var regButton = $('#registerPresale');

	var registrationHost;
	$.getJSON('../js/config/presaleService.json', function(data) {
		console.log('presaleService', data.host);
		registrationHost = data.host;
	});
}

jQuery(document).ready(function($){

	/* outdated browser plugin function */

	outdatedBrowser({
		bgColor: '#f25648',
		color: '#ffffff',
		lowerThan: 'transform',
		languagePath: '../outdatedbrowser/lang/en.html'
	});

	/* image lazy load function */

	var myLazyLoad = new LazyLoad({
		class_loading: 'lazy',
		threshold: 500
	});

	/* navigation toggle */

	var navigationButton = $('.navigation-button');
	var navOpenClose = $('.nav-open-close');
	var sidenav = $('.sidenav');

	navigationButton.on('click', function() {
		navOpenClose.toggleClass('active');
		sidenav.toggleClass('active');
	});

	/* smooth scroll */

	function smoothScroll(target) {
		$('body,html').animate(
			{ 'scrollTop': target.offset().top },
			600
		);
	}

	var	navigationItems = $('#navbar a.scrollable');
	var backToTopButton = $('#backToTop');
	var scrollToVideo = $('#play-video');

	//smooth scroll to the section
	navigationItems.on('click', function(event){
		event.preventDefault();
		smoothScroll($(this.hash));
	});

	backToTopButton.on('click', function(event){
		event.preventDefault();
		smoothScroll($(this.hash));
	});

	scrollToVideo.on('click', function(event){
		event.preventDefault();
		smoothScroll($(this.hash));
		$('#bubbled-video')[0].src += "&autoplay=1";
	});

	/* back to top button */

	if (window.innerWidth < 768) { /* change back to top button for mobile */
		backToTopButton.text('^');
		backToTopButton.css('bottom', '30px');
		backToTopButton.css('right', '30px');
		backToTopButton.css('font-size', '50px');
		backToTopButton.css('line-height', '45px');

		var chevrons = document.getElementsByClassName('glyphicon-chevron-left');

		for (var i = 0; i < chevrons.length; i++) {
			chevrons[i].classList.add('glyphicon-chevron-right');
		}
	}

	$(window).scroll(function() {
		if (backToTopButton.length) {
			$(document).scrollTop() > $(window).height() ? backToTopButton.css('opacity', 0.8) : backToTopButton.css('opacity', 0);
		}
	});

	/* countdown using Block height */

	if ($('.dial').length) {

		function getBlockHeight() {
			var settings = {
				"async": true,
				"crossDomain": true,
				"url": "https://mainnet.infura.io/sdjHHA6KNe8bRiWyCM5n",
				"contentType ": "application/json",
				"method": "POST",
				"data": JSON.stringify({"jsonrpc": "2.0", "id": 1, "method": "eth_blockNumber", "params": []})
			}

			$.ajax(settings).done(function (response) {
				if (response) {
					currentBlock = parseInt(response.result, 16);
					updateCounters();

					if (currentBlock >= saleBlock) {
						console.log('SALE HAS STARTED!!!');
						$('#est-date').html('SALE HAS STARTED!!!');
					}
				}
			});
		}

		function updateCounters() {
			// calculate blocks to sale block height
			var blocksToSale = saleBlock - currentBlock;

			// calculate time to sale (diff block height * avg. block time)
			var timeToSale = blocksToSale * avgBlockTime; //secs
			var saleDate = new Date();
			saleDate.setSeconds(saleDate.getSeconds() + timeToSale);

			// update some HTML ...
			$('.dial').val(currentBlock).trigger('change');
			$('#est-date').html(saleDate);
		}

		// set sale block height and average time between blocks
		var saleBlock = 5356000; // old start block, incorrect by a day
		//var saleBlock = 5368000; // corrected start block for 2nd April
		var avgBlockTime = 14.5; // secs

		// set block height in HTML span
		$('.blockStart').text(d3.format(',')(saleBlock));

		// get current block height
		var currentBlock = 0; // initial value
		getBlockHeight(); // get the current value on page load

		var blockCountdown = setInterval(function() {
			getBlockHeight();

			if (currentBlock >= saleBlock) {
				// stop countdown
				clearInterval(blockCountdown);
			}
		}, 20000); // wait 20 secs

		$('.dial').knob({
			'min': currentBlock,
			'max': saleBlock,
			'width': 150,
			'height': 150,
			'fgColor': 'rgba(0, 251, 252, 0.9)',
			'bgColor': 'rgba(0, 0, 0, 0.5)',
			'inputColor': '#fff',
			'font': 'Roboto',
			'fontWeight': 300,
			'readOnly': true,
			'thickness': '.1',
			'format': function(val) { return d3.format(',')(val) },
			'draw': function() {
        $(this.i).css('font-size', '16px');
      }
		});

	}

	/* token chart */

	function loadChart() {
		setTimeout(tokenChart.load({
			columns: [
				['Pre-Sale', 37800000],
				['Main Sale', 182200000],
				['Bounties', 20000000],
				['Foundation', 20000000],
				['Team', 60000000],
				['Pool to incentivise use & support the ecosystem', 60000000],
				['TGE & legal expenses', 20000000],
			],
			unload: 'TGE'
		}), 8000);
	}

	// check chart element is present on page
	if ($('#token-chart').length){
		var tokenChart = c3.generate({
			bindto: '#token-chart',
			data: {
				columns: [
					['TGE', 400000000]
				],
				type : 'donut'
			},
			transition: {
				duration: 1000
			},
			color: {
				pattern: ['#4c7fe5', '#1F4B7D', '#1f77b4', '#229B1C', '#f7921e','#9467bd'] //[3]=d62728
			},
			tooltip: {
				format: {
					value: function (value, ratio, id, index) { return d3.format(',')(value) + ' BBL'; }
				}
			},
			donut: {
				title: '400M BBL Token',
				label: {
					format: function (value, ratio, id) {
						return d3.format('%')(value/400000000);
					}
				}
			}
		});

		loadChart();
	}

	/* FAQ accordion */

	var acc = document.getElementsByClassName("accordion");
	var i;

	for (i = 0; i < acc.length; i++) {
		acc[i].onclick = function(){
			/* Toggle between adding and removing the "active" class,
			to highlight the button that controls the panel */
			this.classList.toggle("active");

			/* Toggle between hiding and showing the active panel */
			var panel = $(this).parent().nextAll('.accordion-panel');
			if (panel[0].style.maxHeight){
				panel[0].style.maxHeight = null;
			} else {
				panel[0].style.maxHeight = panel[0].scrollHeight + "px";
			}
		}
	}

	/* Pre-sale logic */

	if ($('#presale').length) {
		// override submit functionality
		$('.presale-form form').submit(function(event) {
			event.preventDefault();
			$('#presale-form-error').html('');
			disableRegButton()

			var elements = this.elements;
			console.log('elements', elements);

			if (elements.email.value !== elements.confirmEmail.value) {
				$('#presale-form-error').html('Email addresses do not match.');
				enableRegButton()
				return;
			}

			var presaleAjaxSettings = {
				"async": true,
				"crossDomain": true,
				"url": registrationHost + "/api/v1/register",
				"method": "POST",
				"headers": {
					"content-type": "application/json"
				},
				"processData": false,
				"dataType": 'json',
				"data": JSON.stringify({
					email: elements.email.value,
					telegram: elements.telegram.value,
					contrib: parseInt(elements.contrib.value) || 0,
					wallet: elements.wallet.value,
					country: elements.country.value,
					legalchecked: elements.legalchecked.value == 'on' ? true : false,
					grecaptcha: elements['g-recaptcha-response'].value
				}),
				'success': function(data) {
					window.location.href = "/registered/";
				},
				'error': function(xhr, testStatus, error) {
					grecaptcha.reset();
					enableRegButton()
					if (xhr.length > 0) {
						$('#presale-form-error').html(xhr.responseJSON.error);
					} else {
						$('#presale-form-error').html('Something went wrong');
					}
					
				}
			}

			$.ajax(presaleAjaxSettings).done(function (response) {});

		});
	}

});
