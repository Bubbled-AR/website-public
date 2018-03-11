"use strict";

/*////////////////////////////////////
Site
////////////////////////////////////*/

"use strict";

var Site = Site || {};
var GK = GK || {};
var BK = BK || {};

Site = {
    dataManager: null,
    canvasManager: null,
    modelManager: null,

    fontsLoaded: false,
    modelsLoaded: false,
    windowLoaded: false,
    windowResizing: false,
    ready: false,

    ww: 0.0,
    wh: 0.0,
    bh: 0.0,
    ps: 0.0,

    init: function() {
        Site.canvas = document.getElementById("terra-canvas");
        Site.sizeElements();

        Site.canvasManager = new Site.CanvasManager();
        Site.modelManager = new Site.ModelManager();
        Site.dataManager = new Site.DataManager();

        Site.canvasManager.init(Site.canvas);

        Site.canvasManager.globe.offsetPower = -0.4;
        Site.canvasManager.globe.waveEffectStr = 0.0;
        Site.canvasManager.globe.ringEffectStr = 0.0;
        Site.canvasManager.globe.pointSize = Site.ps;
        Site.canvasManager.quakes.pointSize = Site.ps / 1.1;

        Site.canvasManager.globe.alpha = 0.0;
        Site.canvasManager.ring.alpha = 0.0;
        Site.canvasManager.nebula.alpha = 0.0;
        Site.canvasManager.bokeh.alpha = 0.0;
        Site.canvasManager.quakes.alpha = 0.0;
        Site.canvasManager.bigQuake.alpha = 0.0;

        // Add listeners, load data
        Site.addEventListeners();
        Site.modelManager.load();
        Site.dataManager.load();

        // Background model is preloaded
        var bgModel = Site.modelManager.models.background;
        Site.canvasManager.background.loadModel(bgModel);

        var bodyClass = (Site.isMobile) ? "mobile" : "desktop";
        document.body.classList.add(bodyClass);
    },

    getGlobePointSize: function() {
        if (Site.isMobile) {
            return Math.max(2.0, Site.wh * 0.0052);
        }

        return Math.max(2.0, Site.wh * 0.0042);
    },

    addEventListeners: function() {
        Site.modelManager.loadSignal.add(Site, Site.modelsDidLoad);
        Site.dataManager.loadSignal.add(Site, Site.dataDidLoad);

        window.addEventListener("load", function(){
            Site.windowDidLoad();
        });

        if (Site.isMobile) {
            window.addEventListener("orientationchange", function(){
                Site.windowDidResize();
                Site.updateCanvas();
            });
        }

        if (Site.isDesktop) {
            window.addEventListener("resize", function() {
                if (!Site.windowResizing) {
                    document.body.classList.add("resizing");
                    Site.windowResizing = true;
                }
            });

            window.addEventListener("resize", Site.debounce(function() {
                document.body.classList.remove("resizing");
                Site.windowResizing = false;
                Site.windowDidResize();
                Site.updateCanvas();
            }, 200));
        }
    },

    windowDidLoad: function() {
        Site.windowLoaded = true;
        Site.launchSite();
    },

    launchSite: function() {
        Site.ready = (Site.windowLoaded && Site.modelsLoaded && Site.fontsLoaded);

        if (Site.ready) {
            Site.playIntroAnimation();
        }
    },

    sizeElements: function() {
        Site.bh = document.body.offsetHeight;
        Site.ww = window.innerWidth;
        Site.wh = window.innerHeight;
        Site.canvas.width = Site.ww;
        Site.canvas.height = Site.wh;
        Site.ps = Site.getGlobePointSize();
        if (Site.isMobile) {
            Site.canvas.height += 68;
        }
    },

    windowDidResize: function() {
        Site.sizeElements();
    },

    fontsDidActivate: function() {
        Site.fontsLoaded = true;
        Site.launchSite();
    },

    updateCanvas: function(){
        var cm = Site.canvasManager;
        cm.updateViewport();
        cm.globe.pointSize = Site.ps;
        cm.quakes.pointSize = Site.ps / 1.1;
    },

    playIntroAnimation: function(){
        var cm = Site.canvasManager;

        var offsetStart = cm.globe.offsetPower;
        var offsetEnd = 0.0;
        var offsetDelta = offsetEnd - offsetStart;

        var intro = new Animation(0.9);
        intro.updateFn = function(value) {
            var v = BK.Ease.inOutSine(value);
            cm.globe.offsetPower = offsetStart + (v * offsetDelta);
        };
        intro.completeFn = function() {
            cm.globe.offsetPower = 0.0;
            Site.intro = null;
        };
        intro.start();

        cm.pulse(0.2, 0.08, 0.02, 3.8);
        Site.pulseInterval = setTimeout(function() {
            Site.pulse();
        }, 5250);
    },

    pulse: function() {
        Site.canvasManager.quakePulse();
        Site.pulseInterval = setTimeout(Site.pulse, 5250 + (Math.random() * 1000));
    },

    modelsDidLoad: function() {
        var mm = Site.modelManager;
        var cm = Site.canvasManager;

        cm.ring.loadGeometry(mm.models.ring);
        cm.nebula.loadGeometry(mm.models.nebula);
        cm.globe.loadGeometry(mm.models.globe);

        var a = new Animation(0.4);
        a.updateFn = function(value) {
            cm.ring.alpha = value;
            cm.globe.alpha = value;
            cm.nebula.alpha = value;
            cm.bokeh.alpha = value * 0.2;
        };
        a.start();

        Site.modelsLoaded = true;
        Site.launchSite();
    },

    dataDidLoad: function() {
        var a = new Animation(0.4);

        var cm = Site.canvasManager;
        a.updateFn = function(value) {
            cm.quakes.alpha = value;
        };

        a.start();
        var earthquakes = Site.dataManager.earthquakes;
        Site.canvasManager.quakesDidLoad(earthquakes);
    }
};

// Utilities

Site.isMobile = (window.orientation !== undefined) || (navigator.userAgent.indexOf("IEMobile") !== -1);
Site.isDesktop = !Site.isMobile;
Site.debounce = function debounce(func, wait, immediate) {
    var timeout;
    return function() {
        var context = this;
        var args = arguments;
        var later = function() {
            timeout = null;
            if (!immediate) {
                func.apply(context, args);
            }
        };

        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) {
            func.apply(context, args);
        }
    };
};

/*////////////////////////////////////
DataManager
////////////////////////////////////*/

var earthquakesJSON = {"type":"FeatureCollection","metadata":{"generated":1513991162000,"url":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson","title":"USGS Magnitude 4.5+ Earthquakes, Past Month","status":200,"api":"1.5.8","count":386},"features":[{"type":"Feature","properties":{"mag":5,"place":"251km N of Chichi-shima, Japan","time":1513984255720,"updated":1513985600040,"tz":600,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bv7f","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bv7f.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":385,"net":"us","code":"1000bv7f","ids":",us1000bv7f,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":2.254,"rms":0.85,"gap":97,"magType":"mww","type":"earthquake","title":"M 5.0 - 251km N of Chichi-shima, Japan"},"geometry":{"type":"Point","coordinates":[142.6236,29.3251,7.15]},"id":"us1000bv7f"},
{"type":"Feature","properties":{"mag":4.9,"place":"148km NE of Petropavlovsk-Kamchatskiy, Russia","time":1513981705860,"updated":1513984041443,"tz":660,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bv74","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bv74.geojson","felt":2,"cdi":4.6,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":370,"net":"us","code":"1000bv74","ids":",us1000bv74,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":1.35,"rms":0.62,"gap":113,"magType":"mb","type":"earthquake","title":"M 4.9 - 148km NE of Petropavlovsk-Kamchatskiy, Russia"},"geometry":{"type":"Point","coordinates":[160.4345,53.8481,64.43]},"id":"us1000bv74"},
{"type":"Feature","properties":{"mag":4.7,"place":"73km SSW of Bengkulu, Indonesia","time":1513964475030,"updated":1513970137040,"tz":420,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bv31","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bv31.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":340,"net":"us","code":"1000bv31","ids":",us1000bv31,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":1.016,"rms":1.15,"gap":86,"magType":"mb","type":"earthquake","title":"M 4.7 - 73km SSW of Bengkulu, Indonesia"},"geometry":{"type":"Point","coordinates":[101.9364,-4.3777,45.77]},"id":"us1000bv31"},
{"type":"Feature","properties":{"mag":5.3,"place":"177km S of Port Blair, India","time":1513958330520,"updated":1513974410040,"tz":360,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bv1g","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bv1g.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":432,"net":"us","code":"1000bv1g","ids":",us1000bv1g,","sources":",us,","types":",geoserve,moment-tensor,origin,phase-data,","nst":null,"dmin":1.581,"rms":0.97,"gap":88,"magType":"mb","type":"earthquake","title":"M 5.3 - 177km S of Port Blair, India"},"geometry":{"type":"Point","coordinates":[92.8822,10.0706,38.36]},"id":"us1000bv1g"},
{"type":"Feature","properties":{"mag":5.4,"place":"152km NE of Petropavlovsk-Kamchatskiy, Russia","time":1513953857710,"updated":1513989753841,"tz":660,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bv11","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bv11.geojson","felt":6,"cdi":3.7,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":451,"net":"us","code":"1000bv11","ids":",us1000bv11,","sources":",us,","types":",dyfi,geoserve,moment-tensor,origin,phase-data,","nst":null,"dmin":1.389,"rms":1.25,"gap":82,"magType":"mww","type":"earthquake","title":"M 5.4 - 152km NE of Petropavlovsk-Kamchatskiy, Russia"},"geometry":{"type":"Point","coordinates":[160.5303,53.8365,45.58]},"id":"us1000bv11"},
{"type":"Feature","properties":{"mag":5,"place":"219km S of Fort McPherson, Canada","time":1513929612820,"updated":1513962880265,"tz":-480,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000buxc","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000buxc.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":385,"net":"us","code":"1000buxc","ids":",us1000buxc,ak17638335,","sources":",us,ak,","types":",geoserve,moment-tensor,origin,phase-data,","nst":null,"dmin":1.403,"rms":0.94,"gap":49,"magType":"mww","type":"earthquake","title":"M 5.0 - 219km S of Fort McPherson, Canada"},"geometry":{"type":"Point","coordinates":[-134.0497,65.4953,1.72]},"id":"us1000buxc"},
{"type":"Feature","properties":{"mag":4.9,"place":"207km NNW of Tobelo, Indonesia","time":1513920791010,"updated":1513923294040,"tz":480,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000buww","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000buww.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":369,"net":"us","code":"1000buww","ids":",us1000buww,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":2.529,"rms":0.77,"gap":109,"magType":"mb","type":"earthquake","title":"M 4.9 - 207km NNW of Tobelo, Indonesia"},"geometry":{"type":"Point","coordinates":[126.9743,3.2877,55.79]},"id":"us1000buww"},
{"type":"Feature","properties":{"mag":4.6,"place":"30km SE of Catacaos, Peru","time":1513915024980,"updated":1513916415040,"tz":-300,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000buw7","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000buw7.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":326,"net":"us","code":"1000buw7","ids":",us1000buw7,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":1.901,"rms":0.92,"gap":158,"magType":"mb","type":"earthquake","title":"M 4.6 - 30km SE of Catacaos, Peru"},"geometry":{"type":"Point","coordinates":[-80.4563,-5.4215,10]},"id":"us1000buw7"},
{"type":"Feature","properties":{"mag":4.8,"place":"60km SSW of Hirara, Japan","time":1513890313920,"updated":1513893885040,"tz":480,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000burz","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000burz.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":354,"net":"us","code":"1000burz","ids":",us1000burz,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":1.864,"rms":1.12,"gap":155,"magType":"mb","type":"earthquake","title":"M 4.8 - 60km SSW of Hirara, Japan"},"geometry":{"type":"Point","coordinates":[125.048,24.3019,35]},"id":"us1000burz"},
{"type":"Feature","properties":{"mag":4.6,"place":"5km SW of Andalucia, Colombia","time":1513884400150,"updated":1513911290824,"tz":-300,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bung","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bung.geojson","felt":12,"cdi":3.8,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":330,"net":"us","code":"1000bung","ids":",us1000bung,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":2.002,"rms":0.76,"gap":91,"magType":"mb","type":"earthquake","title":"M 4.6 - 5km SW of Andalucia, Colombia"},"geometry":{"type":"Point","coordinates":[-76.2035,4.1427,156.27]},"id":"us1000bung"},
{"type":"Feature","properties":{"mag":5.2,"place":"51km WNW of Ravar, Iran","time":1513875886610,"updated":1513891349199,"tz":210,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000buiv","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000buiv.geojson","felt":6,"cdi":2.8,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":418,"net":"us","code":"1000buiv","ids":",us1000buiv,","sources":",us,","types":",dyfi,geoserve,moment-tensor,origin,phase-data,","nst":null,"dmin":5.853,"rms":0.87,"gap":58,"magType":"mb","type":"earthquake","title":"M 5.2 - 51km WNW of Ravar, Iran"},"geometry":{"type":"Point","coordinates":[56.281,31.3604,10]},"id":"us1000buiv"},
{"type":"Feature","properties":{"mag":4.9,"place":"89km WSW of San Antonio, Chile","time":1513866059500,"updated":1513873879040,"tz":-300,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000buex","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000buex.geojson","felt":18,"cdi":4.8,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":378,"net":"us","code":"1000buex","ids":",us1000buex,","sources":",us,","types":",dyfi,geoserve,moment-tensor,origin,phase-data,","nst":null,"dmin":0.791,"rms":0.93,"gap":176,"magType":"mb","type":"earthquake","title":"M 4.9 - 89km WSW of San Antonio, Chile"},"geometry":{"type":"Point","coordinates":[-72.5257,-33.8815,10]},"id":"us1000buex"},
{"type":"Feature","properties":{"mag":4.9,"place":"205km NE of Ndoi Island, Fiji","time":1513862104190,"updated":1513872373040,"tz":-720,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bugd","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bugd.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":369,"net":"us","code":"1000bugd","ids":",us1000bugd,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":7.265,"rms":0.5,"gap":93,"magType":"mb","type":"earthquake","title":"M 4.9 - 205km NE of Ndoi Island, Fiji"},"geometry":{"type":"Point","coordinates":[-177.6112,-19.1107,557.35]},"id":"us1000bugd"},
{"type":"Feature","properties":{"mag":4.9,"place":"155km NNE of Ndoi Island, Fiji","time":1513862093180,"updated":1513871783040,"tz":-720,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bue8","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bue8.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":369,"net":"us","code":"1000bue8","ids":",us1000bue8,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":7.782,"rms":1.13,"gap":82,"magType":"mb","type":"earthquake","title":"M 4.9 - 155km NNE of Ndoi Island, Fiji"},"geometry":{"type":"Point","coordinates":[-178.1591,-19.3413,493.12]},"id":"us1000bue8"},
{"type":"Feature","properties":{"mag":4.5,"place":"149km N of Calama, Chile","time":1513831164340,"updated":1513831584040,"tz":-240,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bu6j","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bu6j.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":312,"net":"us","code":"1000bu6j","ids":",us1000bu6j,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":0.729,"rms":0.68,"gap":76,"magType":"mb","type":"earthquake","title":"M 4.5 - 149km N of Calama, Chile"},"geometry":{"type":"Point","coordinates":[-68.7118,-21.1294,137.62]},"id":"us1000bu6j"},
{"type":"Feature","properties":{"mag":4.5,"place":"91km SSE of Taron, Papua New Guinea","time":1513831035540,"updated":1513832022040,"tz":600,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bu6t","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bu6t.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":312,"net":"us","code":"1000bu6t","ids":",us1000bu6t,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":1.603,"rms":0.69,"gap":172,"magType":"mb","type":"earthquake","title":"M 4.5 - 91km SSE of Taron, Papua New Guinea"},"geometry":{"type":"Point","coordinates":[153.429,-5.1881,47.09]},"id":"us1000bu6t"},
{"type":"Feature","properties":{"mag":5.1,"place":"98km E of Nishinoomote, Japan","time":1513827657220,"updated":1513828667040,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bu5c","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bu5c.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":400,"net":"us","code":"1000bu5c","ids":",us1000bu5c,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":2.632,"rms":0.95,"gap":97,"magType":"mb","type":"earthquake","title":"M 5.1 - 98km E of Nishinoomote, Japan"},"geometry":{"type":"Point","coordinates":[132.0224,30.6723,30.73]},"id":"us1000bu5c"},
{"type":"Feature","properties":{"mag":5,"place":"13km W of San Pedro Jicayan, Mexico","time":1513826619570,"updated":1513964290904,"tz":-360,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bu4s","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bu4s.geojson","felt":20,"cdi":3.8,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":392,"net":"us","code":"1000bu4s","ids":",us1000bu4s,","sources":",us,","types":",dyfi,geoserve,moment-tensor,origin,phase-data,","nst":null,"dmin":1.213,"rms":0.93,"gap":177,"magType":"mww","type":"earthquake","title":"M 5.0 - 13km W of San Pedro Jicayan, Mexico"},"geometry":{"type":"Point","coordinates":[-98.1094,16.4247,14.08]},"id":"us1000bu4s"},
{"type":"Feature","properties":{"mag":4.9,"place":"87km WNW of Honiara, Solomon Islands","time":1513825262220,"updated":1513826572040,"tz":660,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bu47","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bu47.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":369,"net":"us","code":"1000bu47","ids":",us1000bu47,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":0.787,"rms":0.87,"gap":99,"magType":"mb","type":"earthquake","title":"M 4.9 - 87km WNW of Honiara, Solomon Islands"},"geometry":{"type":"Point","coordinates":[159.1897,-9.1906,10]},"id":"us1000bu47"},
{"type":"Feature","properties":{"mag":5.7,"place":"249km NNE of Chichi-shima, Japan","time":1513825219050,"updated":1513873696040,"tz":600,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bu46","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bu46.geojson","felt":null,"cdi":null,"mmi":2.53,"alert":"green","status":"reviewed","tsunami":0,"sig":500,"net":"us","code":"1000bu46","ids":",us1000bu46,","sources":",us,","types":",geoserve,losspager,moment-tensor,origin,phase-data,shakemap,","nst":null,"dmin":2.232,"rms":1.08,"gap":113,"magType":"mww","type":"earthquake","title":"M 5.7 - 249km NNE of Chichi-shima, Japan"},"geometry":{"type":"Point","coordinates":[142.7204,29.2858,16.24]},"id":"us1000bu46"},
{"type":"Feature","properties":{"mag":5.2,"place":"244km N of Chichi-shima, Japan","time":1513821413090,"updated":1513871639040,"tz":600,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bu37","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bu37.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":416,"net":"us","code":"1000bu37","ids":",us1000bu37,","sources":",us,","types":",geoserve,moment-tensor,origin,phase-data,","nst":null,"dmin":2.193,"rms":1.08,"gap":97,"magType":"mww","type":"earthquake","title":"M 5.2 - 244km N of Chichi-shima, Japan"},"geometry":{"type":"Point","coordinates":[142.5418,29.2744,7.76]},"id":"us1000bu37"},
{"type":"Feature","properties":{"mag":4.9,"place":"240km N of Chichi-shima, Japan","time":1513816955090,"updated":1513818181040,"tz":600,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bu2l","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bu2l.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":369,"net":"us","code":"1000bu2l","ids":",us1000bu2l,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":2.151,"rms":0.64,"gap":123,"magType":"mb","type":"earthquake","title":"M 4.9 - 240km N of Chichi-shima, Japan"},"geometry":{"type":"Point","coordinates":[142.5265,29.2339,10]},"id":"us1000bu2l"},
{"type":"Feature","properties":{"mag":5,"place":"239km N of Chichi-shima, Japan","time":1513816812560,"updated":1513817833040,"tz":600,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bu2f","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bu2f.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":385,"net":"us","code":"1000bu2f","ids":",us1000bu2f,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":2.148,"rms":0.67,"gap":124,"magType":"mb","type":"earthquake","title":"M 5.0 - 239km N of Chichi-shima, Japan"},"geometry":{"type":"Point","coordinates":[142.5803,29.2234,10.08]},"id":"us1000bu2f"},
{"type":"Feature","properties":{"mag":4.7,"place":"41km WSW of Ciudad Cortes, Costa Rica","time":1513812276690,"updated":1513826842085,"tz":-360,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bu20","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bu20.geojson","felt":2,"cdi":2.5,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":340,"net":"us","code":"1000bu20","ids":",us1000bu20,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":0.652,"rms":1.12,"gap":139,"magType":"mb","type":"earthquake","title":"M 4.7 - 41km WSW of Ciudad Cortes, Costa Rica"},"geometry":{"type":"Point","coordinates":[-83.8601,8.7879,10]},"id":"us1000bu20"},
{"type":"Feature","properties":{"mag":4.7,"place":"31km W of Javanrud, Iran","time":1513801328770,"updated":1513874858331,"tz":210,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000btxf","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000btxf.geojson","felt":2,"cdi":3.8,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":341,"net":"us","code":"1000btxf","ids":",us1000btxf,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":1.04,"rms":0.91,"gap":105,"magType":"mb","type":"earthquake","title":"M 4.7 - 31km W of Javanrud, Iran"},"geometry":{"type":"Point","coordinates":[46.1785,34.7662,10]},"id":"us1000btxf"},
{"type":"Feature","properties":{"mag":4.6,"place":"105km W of Tual, Indonesia","time":1513800027970,"updated":1513806432040,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000btwp","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000btwp.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":326,"net":"us","code":"1000btwp","ids":",us1000btwp,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":2.303,"rms":0.64,"gap":68,"magType":"mb","type":"earthquake","title":"M 4.6 - 105km W of Tual, Indonesia"},"geometry":{"type":"Point","coordinates":[131.8032,-5.7198,67.75]},"id":"us1000btwp"},
{"type":"Feature","properties":{"mag":4.9,"place":"2km WSW of Malard, Iran","time":1513799857990,"updated":1513988189419,"tz":210,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000btwi","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000btwi.geojson","felt":698,"cdi":5.6,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":760,"net":"us","code":"1000btwi","ids":",us1000btwi,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":4.463,"rms":1.35,"gap":57,"magType":"mb","type":"earthquake","title":"M 4.9 - 2km WSW of Malard, Iran"},"geometry":{"type":"Point","coordinates":[50.9494,35.6538,10]},"id":"us1000btwi"},
{"type":"Feature","properties":{"mag":4.8,"place":"27km NE of Putre, Chile","time":1513796023400,"updated":1513796999040,"tz":-240,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000btv2","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000btv2.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":354,"net":"us","code":"1000btv2","ids":",us1000btv2,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":0.354,"rms":0.62,"gap":75,"magType":"mb","type":"earthquake","title":"M 4.8 - 27km NE of Putre, Chile"},"geometry":{"type":"Point","coordinates":[-69.4098,-17.9911,142.44]},"id":"us1000btv2"},
{"type":"Feature","properties":{"mag":4.7,"place":"Western Indian-Antarctic Ridge","time":1513794810040,"updated":1513797664040,"tz":480,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000btub","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000btub.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":340,"net":"us","code":"1000btub","ids":",us1000btub,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":16.715,"rms":1.05,"gap":108,"magType":"mb","type":"earthquake","title":"M 4.7 - Western Indian-Antarctic Ridge"},"geometry":{"type":"Point","coordinates":[117.5154,-49.6557,10]},"id":"us1000btub"},
{"type":"Feature","properties":{"mag":4.9,"place":"37km WNW of Putre, Chile","time":1513793771200,"updated":1513796416040,"tz":-300,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bttr","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bttr.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":369,"net":"us","code":"1000bttr","ids":",us1000bttr,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":0.455,"rms":0.85,"gap":89,"magType":"mb","type":"earthquake","title":"M 4.9 - 37km WNW of Putre, Chile"},"geometry":{"type":"Point","coordinates":[-69.8686,-18.0344,109.87]},"id":"us1000bttr"},
{"type":"Feature","properties":{"mag":4.5,"place":"South of the Fiji Islands","time":1513785005370,"updated":1513810005040,"tz":-720,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000btq0","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000btq0.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":312,"net":"us","code":"1000btq0","ids":",us1000btq0,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":5.49,"rms":1.22,"gap":82,"magType":"mb","type":"earthquake","title":"M 4.5 - South of the Fiji Islands"},"geometry":{"type":"Point","coordinates":[-179.5727,-23.9338,507.65]},"id":"us1000btq0"},
{"type":"Feature","properties":{"mag":4.9,"place":"87km E of Nishinoomote, Japan","time":1513784395700,"updated":1513809649040,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000btpv","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000btpv.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":369,"net":"us","code":"1000btpv","ids":",us1000btpv,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":2.607,"rms":0.56,"gap":96,"magType":"mb","type":"earthquake","title":"M 4.9 - 87km E of Nishinoomote, Japan"},"geometry":{"type":"Point","coordinates":[131.9051,30.6612,25.08]},"id":"us1000btpv"},
{"type":"Feature","properties":{"mag":5.1,"place":"91km E of Nishinoomote, Japan","time":1513781100330,"updated":1513782480040,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000btp6","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000btp6.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":400,"net":"us","code":"1000btp6","ids":",us1000btp6,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":2.562,"rms":0.77,"gap":120,"magType":"mb","type":"earthquake","title":"M 5.1 - 91km E of Nishinoomote, Japan"},"geometry":{"type":"Point","coordinates":[131.958,30.7259,16.7]},"id":"us1000btp6"},
{"type":"Feature","properties":{"mag":5.5,"place":"103km E of Nishinoomote, Japan","time":1513777254670,"updated":1513788953040,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000btna","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000btna.geojson","felt":1,"cdi":2.2,"mmi":3.37,"alert":"green","status":"reviewed","tsunami":0,"sig":466,"net":"us","code":"1000btna","ids":",us1000btna,","sources":",us,","types":",dyfi,geoserve,losspager,moment-tensor,origin,phase-data,shakemap,","nst":null,"dmin":2.69,"rms":1.06,"gap":42,"magType":"mww","type":"earthquake","title":"M 5.5 - 103km E of Nishinoomote, Japan"},"geometry":{"type":"Point","coordinates":[132.0681,30.6252,10]},"id":"us1000btna"},
{"type":"Feature","properties":{"mag":4.9,"place":"64km SSW of Palaiochora, Greece","time":1513743502080,"updated":1513744408040,"tz":120,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000btgz","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000btgz.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":369,"net":"us","code":"1000btgz","ids":",us1000btgz,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":3.163,"rms":1.02,"gap":128,"magType":"mb","type":"earthquake","title":"M 4.9 - 64km SSW of Palaiochora, Greece"},"geometry":{"type":"Point","coordinates":[23.4476,34.6844,20.25]},"id":"us1000btgz"},
{"type":"Feature","properties":{"mag":4.6,"place":"66km SE of Saint David's, Grenada","time":1513743216450,"updated":1513770748522,"tz":-240,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000btgv","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000btgv.geojson","felt":4,"cdi":3.1,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":327,"net":"us","code":"1000btgv","ids":",us1000btgv,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":0.654,"rms":0.75,"gap":129,"magType":"mb","type":"earthquake","title":"M 4.6 - 66km SE of Saint David's, Grenada"},"geometry":{"type":"Point","coordinates":[-61.1797,11.6677,52.82]},"id":"us1000btgv"},
{"type":"Feature","properties":{"mag":5.3,"place":"89km SSE of Pangai, Tonga","time":1513723971960,"updated":1513807216040,"tz":-720,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bte7","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bte7.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":432,"net":"us","code":"1000bte7","ids":",us1000bte7,","sources":",us,","types":",geoserve,moment-tensor,origin,phase-data,","nst":null,"dmin":6.872,"rms":1.72,"gap":76,"magType":"mb","type":"earthquake","title":"M 5.3 - 89km SSE of Pangai, Tonga"},"geometry":{"type":"Point","coordinates":[-173.9329,-20.503,10]},"id":"us1000bte7"},
{"type":"Feature","properties":{"mag":4.6,"place":"55km NE of Misawa, Japan","time":1513712965590,"updated":1513795002040,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bta9","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bta9.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":326,"net":"us","code":"1000bta9","ids":",us1000bta9,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":0.647,"rms":0.75,"gap":141,"magType":"mb","type":"earthquake","title":"M 4.6 - 55km NE of Misawa, Japan"},"geometry":{"type":"Point","coordinates":[141.8716,41.0007,62.39]},"id":"us1000bta9"},
{"type":"Feature","properties":{"mag":5,"place":"West Chile Rise","time":1513709919060,"updated":1513791692040,"tz":-360,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bt8t","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bt8t.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":385,"net":"us","code":"1000bt8t","ids":",us1000bt8t,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":7.125,"rms":0.79,"gap":164,"magType":"mb","type":"earthquake","title":"M 5.0 - West Chile Rise"},"geometry":{"type":"Point","coordinates":[-83.3347,-42.6004,10]},"id":"us1000bt8t"},
{"type":"Feature","properties":{"mag":4.8,"place":"73km W of San Antonio de los Cobres, Argentina","time":1513707612870,"updated":1513790723634,"tz":-180,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bt7m","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bt7m.geojson","felt":1,"cdi":2,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":355,"net":"us","code":"1000bt7m","ids":",us1000bt7m,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":1.671,"rms":0.86,"gap":32,"magType":"mb","type":"earthquake","title":"M 4.8 - 73km W of San Antonio de los Cobres, Argentina"},"geometry":{"type":"Point","coordinates":[-67.0364,-24.2605,171.15]},"id":"us1000bt7m"},
{"type":"Feature","properties":{"mag":4.9,"place":"142km ENE of Hachijo-jima, Japan","time":1513705956460,"updated":1513788859040,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bt70","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bt70.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":369,"net":"us","code":"1000bt70","ids":",us1000bt70,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":1.258,"rms":1.23,"gap":114,"magType":"mb","type":"earthquake","title":"M 4.9 - 142km ENE of Hachijo-jima, Japan"},"geometry":{"type":"Point","coordinates":[141.2558,33.4683,33.06]},"id":"us1000bt70"},
{"type":"Feature","properties":{"mag":5.1,"place":"64km WNW of Zhamog, China","time":1513705255500,"updated":1513787824040,"tz":480,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bt6r","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bt6r.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":400,"net":"us","code":"1000bt6r","ids":",us1000bt6r,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":3.465,"rms":0.71,"gap":23,"magType":"mb","type":"earthquake","title":"M 5.1 - 64km WNW of Zhamog, China"},"geometry":{"type":"Point","coordinates":[95.1042,29.9671,26.88]},"id":"us1000bt6r"},
{"type":"Feature","properties":{"mag":4.5,"place":"98km SSW of La Gomera, Guatemala","time":1513692815770,"updated":1513699056040,"tz":-360,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bt2g","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bt2g.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":312,"net":"us","code":"1000bt2g","ids":",us1000bt2g,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":1.22,"rms":0.76,"gap":143,"magType":"mb","type":"earthquake","title":"M 4.5 - 98km SSW of La Gomera, Guatemala"},"geometry":{"type":"Point","coordinates":[-91.4965,13.312,10]},"id":"us1000bt2g"},
{"type":"Feature","properties":{"mag":4.9,"place":"202km N of Mohean, India","time":1513689812950,"updated":1513696595040,"tz":360,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bt2a","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bt2a.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":369,"net":"us","code":"1000bt2a","ids":",us1000bt2a,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":2.024,"rms":0.69,"gap":49,"magType":"mb","type":"earthquake","title":"M 4.9 - 202km N of Mohean, India"},"geometry":{"type":"Point","coordinates":[93.5519,9.7816,21.31]},"id":"us1000bt2a"},
{"type":"Feature","properties":{"mag":4.8,"place":"55km NW of Diego de Almagro, Chile","time":1513689277550,"updated":1513714820713,"tz":-240,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bt1n","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bt1n.geojson","felt":4,"cdi":4.3,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":356,"net":"us","code":"1000bt1n","ids":",us1000bt1n,","sources":",us,","types":",dyfi,geoserve,moment-tensor,origin,phase-data,","nst":null,"dmin":0.161,"rms":0.72,"gap":66,"magType":"mb","type":"earthquake","title":"M 4.8 - 55km NW of Diego de Almagro, Chile"},"geometry":{"type":"Point","coordinates":[-70.4685,-26.0357,44.98]},"id":"us1000bt1n"},
{"type":"Feature","properties":{"mag":4.5,"place":"62km NNE of Kerman, Iran","time":1513688553080,"updated":1513693642040,"tz":210,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bt1k","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bt1k.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":312,"net":"us","code":"1000bt1k","ids":",us1000bt1k,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":5.928,"rms":0.71,"gap":95,"magType":"mb","type":"earthquake","title":"M 4.5 - 62km NNE of Kerman, Iran"},"geometry":{"type":"Point","coordinates":[57.2994,30.8167,10]},"id":"us1000bt1k"},
{"type":"Feature","properties":{"mag":4.7,"place":"169km S of Itoman, Japan","time":1513674719110,"updated":1513677334040,"tz":480,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bsz8","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bsz8.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":340,"net":"us","code":"1000bsz8","ids":",us1000bsz8,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":2.334,"rms":1.12,"gap":140,"magType":"mb","type":"earthquake","title":"M 4.7 - 169km S of Itoman, Japan"},"geometry":{"type":"Point","coordinates":[127.4621,24.61,10]},"id":"us1000bsz8"},
{"type":"Feature","properties":{"mag":4.9,"place":"216km WNW of Farallon de Pajaros, Northern Mariana Islands","time":1513669656410,"updated":1513670717040,"tz":600,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bsyd","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bsyd.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":369,"net":"us","code":"1000bsyd","ids":",us1000bsyd,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":5.559,"rms":0.65,"gap":103,"magType":"mb","type":"earthquake","title":"M 4.9 - 216km WNW of Farallon de Pajaros, Northern Mariana Islands"},"geometry":{"type":"Point","coordinates":[143.1409,21.5806,292.58]},"id":"us1000bsyd"},
{"type":"Feature","properties":{"mag":5.6,"place":"Southern East Pacific Rise","time":1513661729950,"updated":1513727834040,"tz":-480,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bsxu","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bsxu.geojson","felt":null,"cdi":null,"mmi":0,"alert":"green","status":"reviewed","tsunami":0,"sig":482,"net":"us","code":"1000bsxu","ids":",us1000bsxu,","sources":",us,","types":",geoserve,losspager,moment-tensor,origin,phase-data,shakemap,","nst":null,"dmin":39.775,"rms":0.97,"gap":77,"magType":"mb","type":"earthquake","title":"M 5.6 - Southern East Pacific Rise"},"geometry":{"type":"Point","coordinates":[-114.2496,-21.9224,10]},"id":"us1000bsxu"},
{"type":"Feature","properties":{"mag":4.8,"place":"90km E of Nishinoomote, Japan","time":1513650836070,"updated":1513653560040,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bsxf","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bsxf.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":354,"net":"us","code":"1000bsxf","ids":",us1000bsxf,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":2.544,"rms":0.9,"gap":140,"magType":"mb","type":"earthquake","title":"M 4.8 - 90km E of Nishinoomote, Japan"},"geometry":{"type":"Point","coordinates":[131.9478,30.7416,33.54]},"id":"us1000bsxf"},
{"type":"Feature","properties":{"mag":4.7,"place":"94km E of Nishinoomote, Japan","time":1513647652950,"updated":1513649644040,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bswq","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bswq.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":340,"net":"us","code":"1000bswq","ids":",us1000bswq,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":1.506,"rms":0.58,"gap":100,"magType":"mb","type":"earthquake","title":"M 4.7 - 94km E of Nishinoomote, Japan"},"geometry":{"type":"Point","coordinates":[131.9838,30.7677,31.22]},"id":"us1000bswq"},
{"type":"Feature","properties":{"mag":5.1,"place":"100km E of Nishinoomote, Japan","time":1513639708000,"updated":1513640988040,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bsus","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bsus.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":400,"net":"us","code":"1000bsus","ids":",us1000bsus,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":2.628,"rms":0.73,"gap":59,"magType":"mb","type":"earthquake","title":"M 5.1 - 100km E of Nishinoomote, Japan"},"geometry":{"type":"Point","coordinates":[132.0501,30.6862,7.41]},"id":"us1000bsus"},
{"type":"Feature","properties":{"mag":4.8,"place":"47km N of Naisano Dua, Indonesia","time":1513639534370,"updated":1513640557040,"tz":480,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bsuk","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bsuk.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":354,"net":"us","code":"1000bsuk","ids":",us1000bsuk,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":0.722,"rms":1.08,"gap":74,"magType":"mb","type":"earthquake","title":"M 4.8 - 47km N of Naisano Dua, Indonesia"},"geometry":{"type":"Point","coordinates":[123.8345,-9.1692,101.59]},"id":"us1000bsuk"},
{"type":"Feature","properties":{"mag":4.8,"place":"52km SE of Ishinomaki, Japan","time":1513634073490,"updated":1513682983932,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bssy","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bssy.geojson","felt":6,"cdi":2.8,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":356,"net":"us","code":"1000bssy","ids":",us1000bssy,","sources":",us,","types":",dyfi,geoserve,moment-tensor,origin,phase-data,","nst":null,"dmin":0.819,"rms":0.8,"gap":133,"magType":"mwr","type":"earthquake","title":"M 4.8 - 52km SE of Ishinomaki, Japan"},"geometry":{"type":"Point","coordinates":[141.7729,38.1305,52.25]},"id":"us1000bssy"},
{"type":"Feature","properties":{"mag":4.8,"place":"268km SSE of Amahusu, Indonesia","time":1513631322050,"updated":1513634884040,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bsrl","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bsrl.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":354,"net":"us","code":"1000bsrl","ids":",us1000bsrl,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":3.167,"rms":1.08,"gap":82,"magType":"mb","type":"earthquake","title":"M 4.8 - 268km SSE of Amahusu, Indonesia"},"geometry":{"type":"Point","coordinates":[128.7397,-6.0779,283.54]},"id":"us1000bsrl"},
{"type":"Feature","properties":{"mag":4.6,"place":"11km ESE of Jianyi, China","time":1513622378870,"updated":1513658946440,"tz":480,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bspk","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bspk.geojson","felt":10,"cdi":3.4,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":329,"net":"us","code":"1000bspk","ids":",us1000bspk,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":4.106,"rms":0.68,"gap":98,"magType":"mb","type":"earthquake","title":"M 4.6 - 11km ESE of Jianyi, China"},"geometry":{"type":"Point","coordinates":[122.9948,40.4592,10]},"id":"us1000bspk"},
{"type":"Feature","properties":{"mag":5.1,"place":"119km ESE of Tadine, New Caledonia","time":1513614325710,"updated":1513807790040,"tz":660,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c5mx","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c5mx.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":400,"net":"us","code":"2000c5mx","ids":",us2000c5mx,","sources":",us,","types":",geoserve,moment-tensor,origin,phase-data,","nst":null,"dmin":0.963,"rms":0.91,"gap":103,"magType":"mb","type":"earthquake","title":"M 5.1 - 119km ESE of Tadine, New Caledonia"},"geometry":{"type":"Point","coordinates":[168.9933,-21.8367,9.84]},"id":"us2000c5mx"},
{"type":"Feature","properties":{"mag":4.6,"place":"94km W of San Antonio de los Cobres, Argentina","time":1513612058350,"updated":1513614413040,"tz":-180,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c5mh","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c5mh.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":326,"net":"us","code":"2000c5mh","ids":",us2000c5mh,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":1.569,"rms":0.55,"gap":64,"magType":"mb","type":"earthquake","title":"M 4.6 - 94km W of San Antonio de los Cobres, Argentina"},"geometry":{"type":"Point","coordinates":[-67.2511,-24.2767,207.28]},"id":"us2000c5mh"},
{"type":"Feature","properties":{"mag":4.9,"place":"47km SE of Bilungala, Indonesia","time":1513609769550,"updated":1513612243040,"tz":480,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c5ma","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c5ma.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":369,"net":"us","code":"2000c5ma","ids":",us2000c5ma,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":1.286,"rms":1.15,"gap":55,"magType":"mb","type":"earthquake","title":"M 4.9 - 47km SE of Bilungala, Indonesia"},"geometry":{"type":"Point","coordinates":[123.479,0.0406,144.46]},"id":"us2000c5ma"},
{"type":"Feature","properties":{"mag":4.5,"place":"16km ESE of Matias Romero, Mexico","time":1513593666840,"updated":1513617170322,"tz":-360,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c5jv","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c5jv.geojson","felt":2,"cdi":4.6,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":312,"net":"us","code":"2000c5jv","ids":",us2000c5jv,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":2.701,"rms":1.4,"gap":143,"magType":"mb","type":"earthquake","title":"M 4.5 - 16km ESE of Matias Romero, Mexico"},"geometry":{"type":"Point","coordinates":[-94.8979,16.8193,19.64]},"id":"us2000c5jv"},
{"type":"Feature","properties":{"mag":5.5,"place":"50km NW of Fais, Micronesia","time":1513554076560,"updated":1513615435040,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c5hb","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c5hb.geojson","felt":null,"cdi":null,"mmi":4.06,"alert":"green","status":"reviewed","tsunami":0,"sig":465,"net":"us","code":"2000c5hb","ids":",us2000c5hb,","sources":",us,","types":",geoserve,losspager,moment-tensor,origin,phase-data,shakemap,","nst":null,"dmin":5.808,"rms":0.83,"gap":89,"magType":"mb","type":"earthquake","title":"M 5.5 - 50km NW of Fais, Micronesia"},"geometry":{"type":"Point","coordinates":[140.1547,10.0395,10]},"id":"us2000c5hb"},
{"type":"Feature","properties":{"mag":5.2,"place":"95km WNW of Arawa, Papua New Guinea","time":1513537078740,"updated":1513635209040,"tz":660,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c5fn","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c5fn.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":1,"sig":416,"net":"us","code":"2000c5fn","ids":",us2000c5fn,","sources":",us,","types":",geoserve,moment-tensor,origin,phase-data,","nst":null,"dmin":3.071,"rms":0.72,"gap":63,"magType":"mb","type":"earthquake","title":"M 5.2 - 95km WNW of Arawa, Papua New Guinea"},"geometry":{"type":"Point","coordinates":[154.7359,-5.8965,156.32]},"id":"us2000c5fn"},
{"type":"Feature","properties":{"mag":4.7,"place":"64km NNE of Tobelo, Indonesia","time":1513526002980,"updated":1513528693040,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c5et","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c5et.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":340,"net":"us","code":"2000c5et","ids":",us2000c5et,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":1.704,"rms":0.86,"gap":105,"magType":"mb","type":"earthquake","title":"M 4.7 - 64km NNE of Tobelo, Indonesia"},"geometry":{"type":"Point","coordinates":[128.1717,2.2841,30.94]},"id":"us2000c5et"},
{"type":"Feature","properties":{"mag":5.1,"place":"38km E of Loreto, Philippines","time":1513521134920,"updated":1513744834967,"tz":480,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c5eq","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c5eq.geojson","felt":4,"cdi":3.4,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":402,"net":"us","code":"2000c5eq","ids":",us2000c5eq,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":3.326,"rms":1.08,"gap":44,"magType":"mb","type":"earthquake","title":"M 5.1 - 38km E of Loreto, Philippines"},"geometry":{"type":"Point","coordinates":[125.9228,10.3999,48.82]},"id":"us2000c5eq"},
{"type":"Feature","properties":{"mag":5.3,"place":"37km NNW of Fais, Micronesia","time":1513520718280,"updated":1513635948040,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c5ep","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c5ep.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":432,"net":"us","code":"2000c5ep","ids":",us2000c5ep,","sources":",us,","types":",geoserve,moment-tensor,origin,phase-data,","nst":null,"dmin":5.641,"rms":1.05,"gap":50,"magType":"mb","type":"earthquake","title":"M 5.3 - 37km NNW of Fais, Micronesia"},"geometry":{"type":"Point","coordinates":[140.3501,10.0651,10]},"id":"us2000c5ep"},
{"type":"Feature","properties":{"mag":4.9,"place":"144km NNE of Bristol Island, South Sandwich Islands","time":1513519619570,"updated":1513567196058,"tz":-120,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c5en","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c5en.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":369,"net":"us","code":"2000c5en","ids":",us2000c5en,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":7.147,"rms":0.49,"gap":83,"magType":"mb","type":"earthquake","title":"M 4.9 - 144km NNE of Bristol Island, South Sandwich Islands"},"geometry":{"type":"Point","coordinates":[-25.4427,-57.8682,35]},"id":"us2000c5en"},
{"type":"Feature","properties":{"mag":4.7,"place":"56km SSW of Painan, Indonesia","time":1513512779140,"updated":1513514431040,"tz":420,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c5ef","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c5ef.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":340,"net":"us","code":"2000c5ef","ids":",us2000c5ef,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":2.234,"rms":0.88,"gap":183,"magType":"mb","type":"earthquake","title":"M 4.7 - 56km SSW of Painan, Indonesia"},"geometry":{"type":"Point","coordinates":[100.3821,-1.8236,57.03]},"id":"us2000c5ef"},
{"type":"Feature","properties":{"mag":4.6,"place":"72km E of Nikol'skoye, Russia","time":1513510937610,"updated":1513511913040,"tz":660,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c5e6","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c5e6.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":326,"net":"us","code":"2000c5e6","ids":",us2000c5e6,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":5.413,"rms":0.71,"gap":136,"magType":"mb","type":"earthquake","title":"M 4.6 - 72km E of Nikol'skoye, Russia"},"geometry":{"type":"Point","coordinates":[167.1272,55.1137,29.68]},"id":"us2000c5e6"},
{"type":"Feature","properties":{"mag":4.6,"place":"5km WSW of Muisne, Ecuador","time":1513502191930,"updated":1513928555302,"tz":-300,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c5dx","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c5dx.geojson","felt":2,"cdi":4.1,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":326,"net":"us","code":"2000c5dx","ids":",us2000c5dx,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":1.661,"rms":1.39,"gap":142,"magType":"mb","type":"earthquake","title":"M 4.6 - 5km WSW of Muisne, Ecuador"},"geometry":{"type":"Point","coordinates":[-80.0762,0.5851,54.15]},"id":"us2000c5dx"},
{"type":"Feature","properties":{"mag":4.7,"place":"5km ENE of Taytayan, Philippines","time":1513498528790,"updated":1513502074040,"tz":480,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c5dr","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c5dr.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":340,"net":"us","code":"2000c5dr","ids":",us2000c5dr,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":1.179,"rms":0.62,"gap":99,"magType":"mb","type":"earthquake","title":"M 4.7 - 5km ENE of Taytayan, Philippines"},"geometry":{"type":"Point","coordinates":[126.5493,7.756,70.14]},"id":"us2000c5dr"},
{"type":"Feature","properties":{"mag":4.5,"place":"22km SW of Pedasi, Panama","time":1513493612270,"updated":1513580591366,"tz":-300,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c5d6","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c5d6.geojson","felt":8,"cdi":5.6,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":316,"net":"us","code":"2000c5d6","ids":",us2000c5d6,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":1.8,"rms":0.96,"gap":115,"magType":"mb","type":"earthquake","title":"M 4.5 - 22km SW of Pedasi, Panama"},"geometry":{"type":"Point","coordinates":[-80.1761,7.3857,10]},"id":"us2000c5d6"},
{"type":"Feature","properties":{"mag":4.7,"place":"27km SW of Pedasi, Panama","time":1513492528540,"updated":1513769523147,"tz":-300,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c5d4","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c5d4.geojson","felt":48,"cdi":4.1,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":360,"net":"us","code":"2000c5d4","ids":",us2000c5d4,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":1.848,"rms":0.91,"gap":116,"magType":"mb","type":"earthquake","title":"M 4.7 - 27km SW of Pedasi, Panama"},"geometry":{"type":"Point","coordinates":[-80.1821,7.3377,10]},"id":"us2000c5d4"},
{"type":"Feature","properties":{"mag":4.6,"place":"36km WNW of Dhemaji, India","time":1513491641960,"updated":1513521182566,"tz":330,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c5d1","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c5d1.geojson","felt":3,"cdi":4.1,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":327,"net":"us","code":"2000c5d1","ids":",us2000c5d1,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":2.973,"rms":0.71,"gap":113,"magType":"mb","type":"earthquake","title":"M 4.6 - 36km WNW of Dhemaji, India"},"geometry":{"type":"Point","coordinates":[94.2519,27.6347,16.38]},"id":"us2000c5d1"},
{"type":"Feature","properties":{"mag":4.8,"place":"299km E of Kuril'sk, Russia","time":1513488037630,"updated":1513491137040,"tz":600,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c5ct","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c5ct.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":354,"net":"us","code":"2000c5ct","ids":",us2000c5ct,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":6.408,"rms":0.72,"gap":170,"magType":"mb","type":"earthquake","title":"M 4.8 - 299km E of Kuril'sk, Russia"},"geometry":{"type":"Point","coordinates":[151.6945,45.3606,18.87]},"id":"us2000c5ct"},
{"type":"Feature","properties":{"mag":4.8,"place":"78km W of San Antonio de los Cobres, Argentina","time":1513477684350,"updated":1513478799040,"tz":-180,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c5c6","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c5c6.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":354,"net":"us","code":"2000c5c6","ids":",us2000c5c6,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":1.601,"rms":1.33,"gap":51,"magType":"mww","type":"earthquake","title":"M 4.8 - 78km W of San Antonio de los Cobres, Argentina"},"geometry":{"type":"Point","coordinates":[-67.094,-24.2122,167.97]},"id":"us2000c5c6"},
{"type":"Feature","properties":{"mag":5.2,"place":"Pacific-Antarctic Ridge","time":1513464050870,"updated":1513715846040,"tz":-600,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c5bf","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c5bf.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":416,"net":"us","code":"2000c5bf","ids":",us2000c5bf,","sources":",us,","types":",geoserve,moment-tensor,origin,phase-data,","nst":null,"dmin":22.255,"rms":0.75,"gap":120,"magType":"mb","type":"earthquake","title":"M 5.2 - Pacific-Antarctic Ridge"},"geometry":{"type":"Point","coordinates":[-151.0349,-59.6397,10]},"id":"us2000c5bf"},
{"type":"Feature","properties":{"mag":4.7,"place":"Bonin Islands, Japan region","time":1513445310120,"updated":1513702982040,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c594","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c594.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":340,"net":"us","code":"2000c594","ids":",us2000c594,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":2.81,"rms":0.71,"gap":42,"magType":"mb","type":"earthquake","title":"M 4.7 - Bonin Islands, Japan region"},"geometry":{"type":"Point","coordinates":[139.1964,28.0287,507.64]},"id":"us2000c594"},
{"type":"Feature","properties":{"mag":4.9,"place":"107km NNE of Hihifo, Tonga","time":1513443939850,"updated":1513697870040,"tz":-720,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c58t","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c58t.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":369,"net":"us","code":"2000c58t","ids":",us2000c58t,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":1.866,"rms":0.98,"gap":82,"magType":"mb","type":"earthquake","title":"M 4.9 - 107km NNE of Hihifo, Tonga"},"geometry":{"type":"Point","coordinates":[-173.2735,-15.093,10]},"id":"us2000c58t"},
{"type":"Feature","properties":{"mag":4.8,"place":"90km SSE of Makry Gialos, Greece","time":1513443424680,"updated":1513445231040,"tz":120,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c58s","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c58s.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":354,"net":"us","code":"2000c58s","ids":",us2000c58s,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":1.409,"rms":1.15,"gap":72,"magType":"mb","type":"earthquake","title":"M 4.8 - 90km SSE of Makry Gialos, Greece"},"geometry":{"type":"Point","coordinates":[26.3671,34.2952,10]},"id":"us2000c58s"},
{"type":"Feature","properties":{"mag":5.3,"place":"Central Mid-Atlantic Ridge","time":1513435080130,"updated":1513442460181,"tz":-120,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c58g","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c58g.geojson","felt":null,"cdi":null,"mmi":0,"alert":"green","status":"reviewed","tsunami":0,"sig":432,"net":"us","code":"2000c58g","ids":",us2000c58g,","sources":",us,","types":",geoserve,losspager,origin,phase-data,shakemap,","nst":null,"dmin":14.522,"rms":1.08,"gap":64,"magType":"mww","type":"earthquake","title":"M 5.3 - Central Mid-Atlantic Ridge"},"geometry":{"type":"Point","coordinates":[-27.7746,0.9553,10]},"id":"us2000c58g"},
{"type":"Feature","properties":{"mag":5.4,"place":"Fiji region","time":1513423343950,"updated":1513716675040,"tz":-720,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c57n","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c57n.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":449,"net":"us","code":"2000c57n","ids":",us2000c57n,","sources":",us,","types":",geoserve,moment-tensor,origin,phase-data,","nst":null,"dmin":6.581,"rms":1.1,"gap":46,"magType":"mww","type":"earthquake","title":"M 5.4 - Fiji region"},"geometry":{"type":"Point","coordinates":[-177.6537,-17.2852,382.6]},"id":"us2000c57n"},
{"type":"Feature","properties":{"mag":4.5,"place":"93km N of Finschhafen, Papua New Guinea","time":1513421791900,"updated":1513480956591,"tz":600,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c57k","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c57k.geojson","felt":1,"cdi":3.1,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":312,"net":"us","code":"2000c57k","ids":",us2000c57k,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":3.701,"rms":0.76,"gap":93,"magType":"mb","type":"earthquake","title":"M 4.5 - 93km N of Finschhafen, Papua New Guinea"},"geometry":{"type":"Point","coordinates":[147.9104,-5.7549,24.77]},"id":"us2000c57k"},
{"type":"Feature","properties":{"mag":5,"place":"Pacific-Antarctic Ridge","time":1513400758500,"updated":1513401755040,"tz":-600,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c565","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c565.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":385,"net":"us","code":"2000c565","ids":",us2000c565,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":22.42,"rms":0.62,"gap":132,"magType":"mb","type":"earthquake","title":"M 5.0 - Pacific-Antarctic Ridge"},"geometry":{"type":"Point","coordinates":[-150.6643,-59.6554,10]},"id":"us2000c565"},
{"type":"Feature","properties":{"mag":4.7,"place":"299km E of Kuril'sk, Russia","time":1513388506840,"updated":1513391401040,"tz":600,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c55r","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c55r.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":340,"net":"us","code":"2000c55r","ids":",us2000c55r,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":6.369,"rms":0.68,"gap":182,"magType":"mb","type":"earthquake","title":"M 4.7 - 299km E of Kuril'sk, Russia"},"geometry":{"type":"Point","coordinates":[151.6929,45.4878,13.5]},"id":"us2000c55r"},
{"type":"Feature","properties":{"mag":4.9,"place":"268km ENE of Kuril'sk, Russia","time":1513385807010,"updated":1513388234040,"tz":600,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c556","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c556.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":369,"net":"us","code":"2000c556","ids":",us2000c556,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":5.847,"rms":1.22,"gap":133,"magType":"mb","type":"earthquake","title":"M 4.9 - 268km ENE of Kuril'sk, Russia"},"geometry":{"type":"Point","coordinates":[151.1259,46.0459,35]},"id":"us2000c556"},
{"type":"Feature","properties":{"mag":5.4,"place":"54km S of Tegalbuleud, Indonesia","time":1513383746240,"updated":1513629363040,"tz":420,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c551","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c551.geojson","felt":15,"cdi":3.4,"mmi":null,"alert":null,"status":"reviewed","tsunami":1,"sig":454,"net":"us","code":"2000c551","ids":",us2000c551,","sources":",us,","types":",dyfi,geoserve,moment-tensor,origin,phase-data,","nst":null,"dmin":2.784,"rms":1.1,"gap":27,"magType":"mww","type":"earthquake","title":"M 5.4 - 54km S of Tegalbuleud, Indonesia"},"geometry":{"type":"Point","coordinates":[106.7931,-7.9176,10]},"id":"us2000c551"},
{"type":"Feature","properties":{"mag":4.5,"place":"140km SSW of San Jeronimo de Juarez, Mexico","time":1513379606620,"updated":1513471717040,"tz":-420,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c547","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c547.geojson","felt":7,"cdi":3.7,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":314,"net":"us","code":"2000c547","ids":",us2000c547,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":3.763,"rms":1.15,"gap":284,"magType":"mb","type":"earthquake","title":"M 4.5 - 140km SSW of San Jeronimo de Juarez, Mexico"},"geometry":{"type":"Point","coordinates":[-101.0844,16.0162,19.08]},"id":"us2000c547"},
{"type":"Feature","properties":{"mag":5.1,"place":"47km NE of Visokoi Island, South Georgia and the South Sandwich Islands","time":1513374799860,"updated":1513376093040,"tz":-120,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c537","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c537.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":400,"net":"us","code":"2000c537","ids":",us2000c537,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":5.941,"rms":0.98,"gap":59,"magType":"mb","type":"earthquake","title":"M 5.1 - 47km NE of Visokoi Island, South Georgia and the South Sandwich Islands"},"geometry":{"type":"Point","coordinates":[-26.7386,-56.3586,51.06]},"id":"us2000c537"},
{"type":"Feature","properties":{"mag":4.9,"place":"8km NNW of Tilamuta, Indonesia","time":1513373250900,"updated":1513376415040,"tz":480,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c52u","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c52u.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":369,"net":"us","code":"2000c52u","ids":",us2000c52u,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":1.629,"rms":0.99,"gap":61,"magType":"mb","type":"earthquake","title":"M 4.9 - 8km NNW of Tilamuta, Indonesia"},"geometry":{"type":"Point","coordinates":[122.3305,0.6,89.11]},"id":"us2000c52u"},
{"type":"Feature","properties":{"mag":5.2,"place":"6km NNE of Miyako, Japan","time":1513360722600,"updated":1513713290164,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c4yj","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c4yj.geojson","felt":13,"cdi":3.8,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":421,"net":"us","code":"2000c4yj","ids":",us2000c4yj,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":1.306,"rms":0.8,"gap":74,"magType":"mb","type":"earthquake","title":"M 5.2 - 6km NNE of Miyako, Japan"},"geometry":{"type":"Point","coordinates":[141.9842,39.6876,35]},"id":"us2000c4yj"},
{"type":"Feature","properties":{"mag":6.5,"place":"0km ESE of Cipatujah, Indonesia","time":1513356476930,"updated":1513576201378,"tz":420,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c4v8","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c4v8.geojson","felt":549,"cdi":7.4,"mmi":5.94,"alert":"green","status":"reviewed","tsunami":1,"sig":1056,"net":"us","code":"2000c4v8","ids":",us2000c4v8,","sources":",us,","types":",dyfi,geoserve,losspager,moment-tensor,origin,phase-data,shakemap,","nst":null,"dmin":2.483,"rms":0.94,"gap":84,"magType":"mww","type":"earthquake","title":"M 6.5 - 0km ESE of Cipatujah, Indonesia"},"geometry":{"type":"Point","coordinates":[108.023,-7.7343,91.86]},"id":"us2000c4v8"},
{"type":"Feature","properties":{"mag":5.1,"place":"9km ESE of Tacna, Peru","time":1513347249740,"updated":1513348344330,"tz":-300,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c4ue","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c4ue.geojson","felt":1,"cdi":2,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":400,"net":"us","code":"2000c4ue","ids":",us2000c4ue,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":0.373,"rms":0.72,"gap":122,"magType":"mb","type":"earthquake","title":"M 5.1 - 9km ESE of Tacna, Peru"},"geometry":{"type":"Point","coordinates":[-70.161,-18.0379,96.63]},"id":"us2000c4ue"},
{"type":"Feature","properties":{"mag":5.1,"place":"75km SSE of `Ohonua, Tonga","time":1513342358010,"updated":1513343580040,"tz":-720,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c4tw","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c4tw.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":400,"net":"us","code":"2000c4tw","ids":",us2000c4tw,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":5.19,"rms":1.2,"gap":82,"magType":"mb","type":"earthquake","title":"M 5.1 - 75km SSE of `Ohonua, Tonga"},"geometry":{"type":"Point","coordinates":[-174.5735,-21.9142,10]},"id":"us2000c4tw"},
{"type":"Feature","properties":{"mag":4.7,"place":"53km WSW of Duowa, China","time":1513341504270,"updated":1513344120040,"tz":480,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c4tn","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c4tn.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":340,"net":"us","code":"2000c4tn","ids":",us2000c4tn,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":8.151,"rms":0.56,"gap":65,"magType":"mb","type":"earthquake","title":"M 4.7 - 53km WSW of Duowa, China"},"geometry":{"type":"Point","coordinates":[101.6743,35.0891,12.55]},"id":"us2000c4tn"},
{"type":"Feature","properties":{"mag":5.3,"place":"72km SSE of `Ohonua, Tonga","time":1513339929400,"updated":1513341191040,"tz":-720,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c4th","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c4th.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":432,"net":"us","code":"2000c4th","ids":",us2000c4th,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":5.222,"rms":1.59,"gap":40,"magType":"mww","type":"earthquake","title":"M 5.3 - 72km SSE of `Ohonua, Tonga"},"geometry":{"type":"Point","coordinates":[-174.618,-21.9096,10]},"id":"us2000c4th"},
{"type":"Feature","properties":{"mag":4.8,"place":"70km NNE of Tingo Maria, Peru","time":1513336261750,"updated":1513359270296,"tz":-300,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c4t2","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c4t2.geojson","felt":1,"cdi":3.8,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":355,"net":"us","code":"2000c4t2","ids":",us2000c4t2,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":3.101,"rms":1.15,"gap":129,"magType":"mb","type":"earthquake","title":"M 4.8 - 70km NNE of Tingo Maria, Peru"},"geometry":{"type":"Point","coordinates":[-75.6665,-8.749,39.81]},"id":"us2000c4t2"},
{"type":"Feature","properties":{"mag":5.1,"place":"5km NNE of Pueblo Nuevo, Guatemala","time":1513328864690,"updated":1513874381040,"tz":-360,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c4rw","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c4rw.geojson","felt":31,"cdi":4.8,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":415,"net":"us","code":"2000c4rw","ids":",us2000c4rw,","sources":",us,","types":",dyfi,geoserve,moment-tensor,origin,phase-data,","nst":null,"dmin":0.241,"rms":1.29,"gap":70,"magType":"mww","type":"earthquake","title":"M 5.1 - 5km NNE of Pueblo Nuevo, Guatemala"},"geometry":{"type":"Point","coordinates":[-91.5225,14.7007,110.54]},"id":"us2000c4rw"},
{"type":"Feature","properties":{"mag":4.6,"place":"142km SW of Chirikof Island, Alaska","time":1513327129640,"updated":1513822115447,"tz":-600,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c4rg","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c4rg.geojson","felt":1,"cdi":2,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":326,"net":"us","code":"2000c4rg","ids":",us2000c4rg,ak17600285,","sources":",us,ak,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":null,"rms":0.93,"gap":null,"magType":"mb","type":"earthquake","title":"M 4.6 - 142km SW of Chirikof Island, Alaska"},"geometry":{"type":"Point","coordinates":[-156.8793,54.7681,0]},"id":"us2000c4rg"},
{"type":"Feature","properties":{"mag":4.7,"place":"63km SSW of Nishinoomote, Japan","time":1513325372730,"updated":1513326781040,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c4r7","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c4r7.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":340,"net":"us","code":"2000c4r7","ids":",us2000c4r7,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":2.914,"rms":0.7,"gap":94,"magType":"mb","type":"earthquake","title":"M 4.7 - 63km SSW of Nishinoomote, Japan"},"geometry":{"type":"Point","coordinates":[130.7592,30.2033,35.02]},"id":"us2000c4r7"},
{"type":"Feature","properties":{"mag":4.7,"place":"Central East Pacific Rise","time":1513317083140,"updated":1513327083040,"tz":-420,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c4q9","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c4q9.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":340,"net":"us","code":"2000c4q9","ids":",us2000c4q9,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":13.748,"rms":0.5,"gap":152,"magType":"mb","type":"earthquake","title":"M 4.7 - Central East Pacific Rise"},"geometry":{"type":"Point","coordinates":[-109.8185,-13.3478,10]},"id":"us2000c4q9"},
{"type":"Feature","properties":{"mag":4.5,"place":"14km SSE of Kimitsu, Japan","time":1513305746490,"updated":1513362049122,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c4pc","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c4pc.geojson","felt":36,"cdi":3.1,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":323,"net":"us","code":"2000c4pc","ids":",us2000c4pc,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":1.524,"rms":0.99,"gap":132,"magType":"mb","type":"earthquake","title":"M 4.5 - 14km SSE of Kimitsu, Japan"},"geometry":{"type":"Point","coordinates":[139.9273,35.1994,91.66]},"id":"us2000c4pc"},
{"type":"Feature","properties":{"mag":4.5,"place":"32km S of Jarm, Afghanistan","time":1513295315210,"updated":1513470700040,"tz":270,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c4n2","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c4n2.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":312,"net":"us","code":"2000c4n2","ids":",us2000c4n2,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":0.599,"rms":0.69,"gap":72,"magType":"mb","type":"earthquake","title":"M 4.5 - 32km S of Jarm, Afghanistan"},"geometry":{"type":"Point","coordinates":[70.8715,36.5741,204.78]},"id":"us2000c4n2"},
{"type":"Feature","properties":{"mag":4.9,"place":"90km SSW of Chirovanga, Solomon Islands","time":1513294828830,"updated":1513469847040,"tz":600,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c4n0","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c4n0.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":369,"net":"us","code":"2000c4n0","ids":",us2000c4n0,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":4.112,"rms":0.77,"gap":93,"magType":"mb","type":"earthquake","title":"M 4.9 - 90km SSW of Chirovanga, Solomon Islands"},"geometry":{"type":"Point","coordinates":[156.3159,-7.4253,35]},"id":"us2000c4n0"},
{"type":"Feature","properties":{"mag":5.3,"place":"175km ENE of Tadine, New Caledonia","time":1513283797910,"updated":1513331288551,"tz":660,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c4ki","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c4ki.geojson","felt":1,"cdi":2,"mmi":3.22,"alert":"green","status":"reviewed","tsunami":0,"sig":432,"net":"us","code":"2000c4ki","ids":",us2000c4ki,","sources":",us,","types":",dyfi,geoserve,losspager,moment-tensor,origin,phase-data,shakemap,","nst":null,"dmin":1.428,"rms":1.05,"gap":90,"magType":"mww","type":"earthquake","title":"M 5.3 - 175km ENE of Tadine, New Caledonia"},"geometry":{"type":"Point","coordinates":[169.5371,-21.2182,20.96]},"id":"us2000c4ki"},
{"type":"Feature","properties":{"mag":5.3,"place":"34km W of Duowa, China","time":1513277667150,"updated":1513877760040,"tz":480,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c4i9","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c4i9.geojson","felt":1,"cdi":2,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":432,"net":"us","code":"2000c4i9","ids":",us2000c4i9,","sources":",us,","types":",dyfi,geoserve,moment-tensor,origin,phase-data,","nst":null,"dmin":8.05,"rms":0.83,"gap":25,"magType":"mb","type":"earthquake","title":"M 5.3 - 34km W of Duowa, China"},"geometry":{"type":"Point","coordinates":[101.8754,35.15,9.01]},"id":"us2000c4i9"},
{"type":"Feature","properties":{"mag":4.6,"place":"132km S of Hihifo, Tonga","time":1513274807760,"updated":1513279543040,"tz":-720,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c4gu","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c4gu.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":326,"net":"us","code":"2000c4gu","ids":",us2000c4gu,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":3.841,"rms":0.55,"gap":135,"magType":"mb","type":"earthquake","title":"M 4.6 - 132km S of Hihifo, Tonga"},"geometry":{"type":"Point","coordinates":[-173.9768,-17.1317,90]},"id":"us2000c4gu"},
{"type":"Feature","properties":{"mag":4.8,"place":"Galapagos Triple Junction region","time":1513251255020,"updated":1513252082040,"tz":-420,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c4as","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c4as.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":354,"net":"us","code":"2000c4as","ids":",us2000c4as,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":16.267,"rms":0.93,"gap":205,"magType":"mb","type":"earthquake","title":"M 4.8 - Galapagos Triple Junction region"},"geometry":{"type":"Point","coordinates":[-102.3301,1.6228,10]},"id":"us2000c4as"},
{"type":"Feature","properties":{"mag":4.9,"place":"177km SE of Kuril'sk, Russia","time":1513247969860,"updated":1513251050040,"tz":600,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c4af","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c4af.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":369,"net":"us","code":"2000c4af","ids":",us2000c4af,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":4.892,"rms":1,"gap":113,"magType":"mb","type":"earthquake","title":"M 4.9 - 177km SE of Kuril'sk, Russia"},"geometry":{"type":"Point","coordinates":[149.382,44.043,35.43]},"id":"us2000c4af"},
{"type":"Feature","properties":{"mag":4.6,"place":"58km SSW of Las Minas, Panama","time":1513213869440,"updated":1513274093970,"tz":-300,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c456","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c456.geojson","felt":4,"cdi":3.4,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":327,"net":"us","code":"2000c456","ids":",us2000c456,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":2.152,"rms":0.9,"gap":127,"magType":"mb","type":"earthquake","title":"M 4.6 - 58km SSW of Las Minas, Panama"},"geometry":{"type":"Point","coordinates":[-80.9932,7.3313,11.89]},"id":"us2000c456"},
{"type":"Feature","properties":{"mag":6.5,"place":"82km WNW of Bouvet Island, Bouvet Island","time":1513188222790,"updated":1513205887166,"tz":0,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c3y6","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c3y6.geojson","felt":null,"cdi":null,"mmi":4.73,"alert":"green","status":"reviewed","tsunami":1,"sig":650,"net":"us","code":"2000c3y6","ids":",pt17347000,at00p0wvie,us2000c3y6,","sources":",pt,at,us,","types":",geoserve,impact-link,losspager,moment-tensor,origin,phase-data,shakemap,","nst":null,"dmin":19.84,"rms":0.99,"gap":23,"magType":"mww","type":"earthquake","title":"M 6.5 - 82km WNW of Bouvet Island, Bouvet Island"},"geometry":{"type":"Point","coordinates":[2.1483,-54.2156,10]},"id":"us2000c3y6"},
{"type":"Feature","properties":{"mag":4.6,"place":"29km S of Parapat, Indonesia","time":1513172251210,"updated":1513177308060,"tz":420,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c3tv","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c3tv.geojson","felt":1,"cdi":2.7,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":326,"net":"us","code":"2000c3tv","ids":",us2000c3tv,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":0.296,"rms":0.76,"gap":76,"magType":"mb","type":"earthquake","title":"M 4.6 - 29km S of Parapat, Indonesia"},"geometry":{"type":"Point","coordinates":[98.9461,2.3965,135.73]},"id":"us2000c3tv"},
{"type":"Feature","properties":{"mag":4.6,"place":"87km W of Merizo Village, Guam","time":1513156387740,"updated":1513157905341,"tz":600,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c3sb","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c3sb.geojson","felt":1,"cdi":1,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":326,"net":"us","code":"2000c3sb","ids":",us2000c3sb,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":1.043,"rms":0.84,"gap":101,"magType":"mb","type":"earthquake","title":"M 4.6 - 87km W of Merizo Village, Guam"},"geometry":{"type":"Point","coordinates":[143.8602,13.2324,147.27]},"id":"us2000c3sb"},
{"type":"Feature","properties":{"mag":4.8,"place":"29km SSE of Palaiochora, Greece","time":1513150207980,"updated":1513151121244,"tz":120,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c3ru","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c3ru.geojson","felt":1,"cdi":2.2,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":355,"net":"us","code":"2000c3ru","ids":",us2000c3ru,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":0.979,"rms":1.26,"gap":70,"magType":"mb","type":"earthquake","title":"M 4.8 - 29km SSE of Palaiochora, Greece"},"geometry":{"type":"Point","coordinates":[23.7561,34.9784,38.63]},"id":"us2000c3ru"},
{"type":"Feature","properties":{"mag":4.5,"place":"33km WNW of Constitucion, Chile","time":1513131320850,"updated":1513134640264,"tz":-300,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c3q1","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c3q1.geojson","felt":1,"cdi":3.4,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":312,"net":"us","code":"2000c3q1","ids":",us2000c3q1,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":0.705,"rms":0.68,"gap":93,"magType":"mb","type":"earthquake","title":"M 4.5 - 33km WNW of Constitucion, Chile"},"geometry":{"type":"Point","coordinates":[-72.7559,-35.2101,23.77]},"id":"us2000c3q1"},
{"type":"Feature","properties":{"mag":4.8,"place":"100km WSW of Ust'-Kamchatsk Staryy, Russia","time":1513130439120,"updated":1513822721040,"tz":720,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c3q0","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c3q0.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":354,"net":"us","code":"2000c3q0","ids":",us2000c3q0,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":3.108,"rms":0.84,"gap":88,"magType":"mb","type":"earthquake","title":"M 4.8 - 100km WSW of Ust'-Kamchatsk Staryy, Russia"},"geometry":{"type":"Point","coordinates":[161.0731,55.7843,108.8]},"id":"us2000c3q0"},
{"type":"Feature","properties":{"mag":4.6,"place":"Central Mid-Atlantic Ridge","time":1513129150530,"updated":1513130347040,"tz":-120,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c3px","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c3px.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":326,"net":"us","code":"2000c3px","ids":",us2000c3px,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":12.867,"rms":0.94,"gap":105,"magType":"mb","type":"earthquake","title":"M 4.6 - Central Mid-Atlantic Ridge"},"geometry":{"type":"Point","coordinates":[-32.6992,5.6533,10]},"id":"us2000c3px"},
{"type":"Feature","properties":{"mag":4.6,"place":"98km ENE of Tadine, New Caledonia","time":1513124565730,"updated":1513901465040,"tz":660,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000btsf","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000btsf.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":326,"net":"us","code":"1000btsf","ids":",us1000btsf,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":0.734,"rms":0.9,"gap":183,"magType":"mb","type":"earthquake","title":"M 4.6 - 98km ENE of Tadine, New Caledonia"},"geometry":{"type":"Point","coordinates":[168.7743,-21.2383,10]},"id":"us1000btsf"},
{"type":"Feature","properties":{"mag":4.5,"place":"56km NNE of Kerman, Iran","time":1513121257160,"updated":1513827005130,"tz":210,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c3nu","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c3nu.geojson","felt":1,"cdi":4.6,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":312,"net":"us","code":"2000c3nu","ids":",us2000c3nu,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":5.53,"rms":0.83,"gap":54,"magType":"mb","type":"earthquake","title":"M 4.5 - 56km NNE of Kerman, Iran"},"geometry":{"type":"Point","coordinates":[57.2802,30.7658,10]},"id":"us2000c3nu"},
{"type":"Feature","properties":{"mag":5,"place":"63km SE of Ravar, Iran","time":1513115381780,"updated":1513119760207,"tz":210,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c3ms","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c3ms.geojson","felt":1,"cdi":4.3,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":385,"net":"us","code":"2000c3ms","ids":",us2000c3ms,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":5.46,"rms":0.92,"gap":73,"magType":"mb","type":"earthquake","title":"M 5.0 - 63km SE of Ravar, Iran"},"geometry":{"type":"Point","coordinates":[57.2854,30.8658,10]},"id":"us2000c3ms"},
{"type":"Feature","properties":{"mag":6,"place":"64km NNE of Kerman, Iran","time":1513114891990,"updated":1513489109628,"tz":210,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c3mi","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c3mi.geojson","felt":29,"cdi":5.8,"mmi":7.56,"alert":"green","status":"reviewed","tsunami":0,"sig":571,"net":"us","code":"2000c3mi","ids":",us2000c3mi,","sources":",us,","types":",dyfi,geoserve,losspager,moment-tensor,origin,phase-data,shakemap,","nst":null,"dmin":5.484,"rms":0.83,"gap":24,"magType":"mww","type":"earthquake","title":"M 6.0 - 64km NNE of Kerman, Iran"},"geometry":{"type":"Point","coordinates":[57.276,30.8389,10]},"id":"us2000c3mi"},
{"type":"Feature","properties":{"mag":4.7,"place":"117km NW of Saumlaki, Indonesia","time":1513108536610,"updated":1513178455040,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c3jy","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c3jy.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":340,"net":"us","code":"2000c3jy","ids":",us2000c3jy,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":1.074,"rms":0.78,"gap":37,"magType":"mb","type":"earthquake","title":"M 4.7 - 117km NW of Saumlaki, Indonesia"},"geometry":{"type":"Point","coordinates":[130.6478,-7.1185,81.89]},"id":"us2000c3jy"},
{"type":"Feature","properties":{"mag":4.5,"place":"68km NNE of Kerman, Iran","time":1513097421870,"updated":1513126384776,"tz":210,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c3er","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c3er.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":312,"net":"us","code":"2000c3er","ids":",us2000c3er,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":5.421,"rms":0.77,"gap":92,"magType":"mb","type":"earthquake","title":"M 4.5 - 68km NNE of Kerman, Iran"},"geometry":{"type":"Point","coordinates":[57.3656,30.8469,10]},"id":"us2000c3er"},
{"type":"Feature","properties":{"mag":4.8,"place":"25km S of San Juan Evangelista, Mexico","time":1513092864230,"updated":1513203024707,"tz":-360,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c3dw","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c3dw.geojson","felt":15,"cdi":4.6,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":361,"net":"us","code":"2000c3dw","ids":",us2000c3dw,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":3.206,"rms":1.05,"gap":106,"magType":"mb","type":"earthquake","title":"M 4.8 - 25km S of San Juan Evangelista, Mexico"},"geometry":{"type":"Point","coordinates":[-95.1613,17.6688,108.73]},"id":"us2000c3dw"},
{"type":"Feature","properties":{"mag":4.5,"place":"206km WNW of Port-Olry, Vanuatu","time":1513089472500,"updated":1513092432040,"tz":660,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c3di","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c3di.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":312,"net":"us","code":"2000c3di","ids":",us2000c3di,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":6.77,"rms":0.52,"gap":209,"magType":"mb","type":"earthquake","title":"M 4.5 - 206km WNW of Port-Olry, Vanuatu"},"geometry":{"type":"Point","coordinates":[165.3312,-14.2206,10]},"id":"us2000c3di"},
{"type":"Feature","properties":{"mag":4.9,"place":"90km SSW of Paredon, Mexico","time":1513068801580,"updated":1513125096943,"tz":-360,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c3al","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c3al.geojson","felt":3,"cdi":2.7,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":370,"net":"us","code":"2000c3al","ids":",us2000c3al,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":2.207,"rms":1.07,"gap":159,"magType":"mb","type":"earthquake","title":"M 4.9 - 90km SSW of Paredon, Mexico"},"geometry":{"type":"Point","coordinates":[-94.1801,15.2736,44.66]},"id":"us2000c3al"},
{"type":"Feature","properties":{"mag":5.9,"place":"56km NNE of Kerman, Iran","time":1513068198730,"updated":1513224117040,"tz":210,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c3ag","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c3ag.geojson","felt":12,"cdi":4.2,"mmi":6.99,"alert":"green","status":"reviewed","tsunami":0,"sig":541,"net":"us","code":"2000c3ag","ids":",us2000c3ag,","sources":",us,","types":",dyfi,geoserve,losspager,moment-tensor,origin,phase-data,shakemap,","nst":null,"dmin":5.53,"rms":1.01,"gap":49,"magType":"mww","type":"earthquake","title":"M 5.9 - 56km NNE of Kerman, Iran"},"geometry":{"type":"Point","coordinates":[57.2899,30.7559,10]},"id":"us2000c3ag"},
{"type":"Feature","properties":{"mag":4.7,"place":"118km SE of Pangai, Tonga","time":1513065165520,"updated":1513949415040,"tz":-720,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us1000bt4j","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us1000bt4j.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":340,"net":"us","code":"1000bt4j","ids":",us1000bt4j,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":3.731,"rms":1.06,"gap":110,"magType":"mb","type":"earthquake","title":"M 4.7 - 118km SE of Pangai, Tonga"},"geometry":{"type":"Point","coordinates":[-173.5641,-20.567,10]},"id":"us1000bt4j"},
{"type":"Feature","properties":{"mag":4.5,"place":"2km N of Gunungwaru Satu, Indonesia","time":1513045389940,"updated":1513357815301,"tz":420,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c35s","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c35s.geojson","felt":0,"cdi":1,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":312,"net":"us","code":"2000c35s","ids":",us2000c35s,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":3.368,"rms":0.91,"gap":88,"magType":"mb","type":"earthquake","title":"M 4.5 - 2km N of Gunungwaru Satu, Indonesia"},"geometry":{"type":"Point","coordinates":[107.0503,-7.2203,94.67]},"id":"us2000c35s"},
{"type":"Feature","properties":{"mag":4.9,"place":"Southeast Indian Ridge","time":1513036627750,"updated":1513664021040,"tz":420,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c5lm","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c5lm.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":369,"net":"us","code":"2000c5lm","ids":",us2000c5lm,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":23.39,"rms":0.88,"gap":89,"magType":"mb","type":"earthquake","title":"M 4.9 - Southeast Indian Ridge"},"geometry":{"type":"Point","coordinates":[108.6437,-48.9832,10]},"id":"us2000c5lm"},
{"type":"Feature","properties":{"mag":4.5,"place":"31km NNW of Pagan, Northern Mariana Islands","time":1513035715030,"updated":1513051454040,"tz":600,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c33x","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c33x.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":312,"net":"us","code":"2000c33x","ids":",us2000c33x,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":3.114,"rms":0.49,"gap":77,"magType":"mb","type":"earthquake","title":"M 4.5 - 31km NNW of Pagan, Northern Mariana Islands"},"geometry":{"type":"Point","coordinates":[145.6366,18.3694,187.09]},"id":"us2000c33x"},
{"type":"Feature","properties":{"mag":4.9,"place":"83km S of Raoul Island, New Zealand","time":1513019797630,"updated":1513024951040,"tz":-720,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c2yx","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c2yx.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":369,"net":"us","code":"2000c2yx","ids":",us2000c2yx,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":0.776,"rms":1.23,"gap":76,"magType":"mb","type":"earthquake","title":"M 4.9 - 83km S of Raoul Island, New Zealand"},"geometry":{"type":"Point","coordinates":[-177.9121,-30.0238,37.33]},"id":"us2000c2yx"},
{"type":"Feature","properties":{"mag":5.5,"place":"111km WNW of Iquique, Chile","time":1513018855860,"updated":1513227086040,"tz":-300,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c2xt","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c2xt.geojson","felt":5,"cdi":5.8,"mmi":3.34,"alert":"green","status":"reviewed","tsunami":0,"sig":468,"net":"us","code":"2000c2xt","ids":",us2000c2xt,","sources":",us,","types":",dyfi,geoserve,losspager,moment-tensor,origin,phase-data,shakemap,","nst":null,"dmin":1.038,"rms":1.46,"gap":99,"magType":"mww","type":"earthquake","title":"M 5.5 - 111km WNW of Iquique, Chile"},"geometry":{"type":"Point","coordinates":[-71.0699,-19.7212,7.61]},"id":"us2000c2xt"},
{"type":"Feature","properties":{"mag":5.6,"place":"52km S of Sola, Vanuatu","time":1513013350600,"updated":1513198661040,"tz":660,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c2vg","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c2vg.geojson","felt":null,"cdi":null,"mmi":3.53,"alert":"green","status":"reviewed","tsunami":0,"sig":482,"net":"us","code":"2000c2vg","ids":",us2000c2vg,","sources":",us,","types":",geoserve,losspager,moment-tensor,origin,phase-data,shakemap,","nst":null,"dmin":6.394,"rms":0.96,"gap":42,"magType":"mww","type":"earthquake","title":"M 5.6 - 52km S of Sola, Vanuatu"},"geometry":{"type":"Point","coordinates":[167.4548,-14.3509,187.3]},"id":"us2000c2vg"},
{"type":"Feature","properties":{"mag":4.6,"place":"121km E of Port Blair, India","time":1513010989280,"updated":1513013970040,"tz":360,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c2v8","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c2v8.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":326,"net":"us","code":"2000c2v8","ids":",us2000c2v8,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":5.74,"rms":0.88,"gap":84,"magType":"mb","type":"earthquake","title":"M 4.6 - 121km E of Port Blair, India"},"geometry":{"type":"Point","coordinates":[93.8524,11.808,139.83]},"id":"us2000c2v8"},
{"type":"Feature","properties":{"mag":4.5,"place":"22km NNE of Fais, Micronesia","time":1513004815280,"updated":1513889864040,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c5l9","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c5l9.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":312,"net":"us","code":"2000c5l9","ids":",us2000c5l9,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":5.521,"rms":1.34,"gap":112,"magType":"mb","type":"earthquake","title":"M 4.5 - 22km NNE of Fais, Micronesia"},"geometry":{"type":"Point","coordinates":[140.6077,9.9498,10]},"id":"us2000c5l9"},
{"type":"Feature","properties":{"mag":4.7,"place":"27km SW of Halabjah, Iraq","time":1513003360930,"updated":1513888276486,"tz":180,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c2ug","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c2ug.geojson","felt":9,"cdi":4.8,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":344,"net":"us","code":"2000c2ug","ids":",us2000c2ug,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":0.091,"rms":1.07,"gap":107,"magType":"mb","type":"earthquake","title":"M 4.7 - 27km SW of Halabjah, Iraq"},"geometry":{"type":"Point","coordinates":[45.7471,35.0283,14.71]},"id":"us2000c2ug"},
{"type":"Feature","properties":{"mag":4.6,"place":"72km W of Tobelo, Indonesia","time":1513001478910,"updated":1513883249040,"tz":480,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c2uf","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c2uf.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":326,"net":"us","code":"2000c2uf","ids":",us2000c2uf,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":0.957,"rms":1.03,"gap":126,"magType":"mb","type":"earthquake","title":"M 4.6 - 72km W of Tobelo, Indonesia"},"geometry":{"type":"Point","coordinates":[127.3568,1.7353,99.57]},"id":"us2000c2uf"},
{"type":"Feature","properties":{"mag":5.4,"place":"23km WSW of Halabjah, Iraq","time":1513001397370,"updated":1513883322057,"tz":180,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c2ue","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c2ue.geojson","felt":75,"cdi":6.2,"mmi":5.96,"alert":"green","status":"reviewed","tsunami":0,"sig":495,"net":"us","code":"2000c2ue","ids":",us2000c2ue,","sources":",us,","types":",dyfi,geoserve,losspager,moment-tensor,origin,phase-data,shakemap,","nst":null,"dmin":0.057,"rms":0.67,"gap":43,"magType":"mww","type":"earthquake","title":"M 5.4 - 23km WSW of Halabjah, Iraq"},"geometry":{"type":"Point","coordinates":[45.7636,35.0722,17.68]},"id":"us2000c2ue"},
{"type":"Feature","properties":{"mag":5.6,"place":"137km SE of Pangai, Tonga","time":1512989400130,"updated":1513268632040,"tz":-720,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c2te","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c2te.geojson","felt":null,"cdi":null,"mmi":3.47,"alert":"green","status":"reviewed","tsunami":0,"sig":482,"net":"us","code":"2000c2te","ids":",us2000c2te,","sources":",us,","types":",geoserve,losspager,moment-tensor,origin,phase-data,shakemap,","nst":null,"dmin":3.856,"rms":1.15,"gap":107,"magType":"mb","type":"earthquake","title":"M 5.6 - 137km SE of Pangai, Tonga"},"geometry":{"type":"Point","coordinates":[-173.593,-20.8127,10]},"id":"us2000c2te"},
{"type":"Feature","properties":{"mag":4.6,"place":"46km WNW of Nongstoin, India","time":1512963313720,"updated":1513820144759,"tz":330,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c2rj","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c2rj.geojson","felt":9,"cdi":4.1,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":329,"net":"us","code":"2000c2rj","ids":",us2000c2rj,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":0.912,"rms":0.94,"gap":80,"magType":"mb","type":"earthquake","title":"M 4.6 - 46km WNW of Nongstoin, India"},"geometry":{"type":"Point","coordinates":[90.8605,25.725,10]},"id":"us2000c2rj"},
{"type":"Feature","properties":{"mag":4.6,"place":"Crozet Islands region","time":1512962843040,"updated":1513819768040,"tz":180,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c2ri","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c2ri.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":326,"net":"us","code":"2000c2ri","ids":",us2000c2ri,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":7.642,"rms":0.78,"gap":46,"magType":"mb","type":"earthquake","title":"M 4.6 - Crozet Islands region"},"geometry":{"type":"Point","coordinates":[44.253,-41.123,10]},"id":"us2000c2ri"},
{"type":"Feature","properties":{"mag":4.9,"place":"256km SE of Hachijo-jima, Japan","time":1512961261720,"updated":1513819086040,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c2rf","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c2rf.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":369,"net":"us","code":"2000c2rf","ids":",us2000c2rf,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":2.323,"rms":0.75,"gap":97,"magType":"mb","type":"earthquake","title":"M 4.9 - 256km SE of Hachijo-jima, Japan"},"geometry":{"type":"Point","coordinates":[141.8447,31.5484,10]},"id":"us2000c2rf"},
{"type":"Feature","properties":{"mag":4.7,"place":"187km ENE of Neiafu, Tonga","time":1512953119110,"updated":1513663477040,"tz":-660,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c5kx","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c5kx.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":340,"net":"us","code":"2000c5kx","ids":",us2000c5kx,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":2.688,"rms":1.18,"gap":97,"magType":"mb","type":"earthquake","title":"M 4.7 - 187km ENE of Neiafu, Tonga"},"geometry":{"type":"Point","coordinates":[-172.4381,-17.8257,10]},"id":"us2000c5kx"},
{"type":"Feature","properties":{"mag":4.7,"place":"84km S of Arica, Chile","time":1512951719390,"updated":1512985084003,"tz":-240,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c2qm","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c2qm.geojson","felt":3,"cdi":2.2,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":341,"net":"us","code":"2000c2qm","ids":",us2000c2qm,","sources":",us,","types":",dyfi,geoserve,moment-tensor,origin,phase-data,","nst":null,"dmin":0.625,"rms":0.95,"gap":143,"magType":"mwr","type":"earthquake","title":"M 4.7 - 84km S of Arica, Chile"},"geometry":{"type":"Point","coordinates":[-70.2521,-19.2385,61.63]},"id":"us2000c2qm"},
{"type":"Feature","properties":{"mag":4.6,"place":"75km NE of L'Esperance Rock, New Zealand","time":1512948713810,"updated":1513465046040,"tz":-720,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c4zs","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c4zs.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":326,"net":"us","code":"2000c4zs","ids":",us2000c4zs,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":1.693,"rms":1.35,"gap":110,"magType":"mb","type":"earthquake","title":"M 4.6 - 75km NE of L'Esperance Rock, New Zealand"},"geometry":{"type":"Point","coordinates":[-178.4127,-30.8916,10]},"id":"us2000c4zs"},
{"type":"Feature","properties":{"mag":4.9,"place":"96km NE of Hihifo, Tonga","time":1512932116340,"updated":1512933705040,"tz":-720,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c2ne","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c2ne.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":369,"net":"us","code":"2000c2ne","ids":",us2000c2ne,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":1.927,"rms":0.62,"gap":104,"magType":"mb","type":"earthquake","title":"M 4.9 - 96km NE of Hihifo, Tonga"},"geometry":{"type":"Point","coordinates":[-173.2207,-15.2453,35.31]},"id":"us2000c2ne"},
{"type":"Feature","properties":{"mag":5.3,"place":"49km E of Tadine, New Caledonia","time":1512927014250,"updated":1513357336040,"tz":660,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c2mh","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c2mh.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":432,"net":"us","code":"2000c2mh","ids":",us2000c2mh,","sources":",us,","types":",geoserve,moment-tensor,origin,phase-data,","nst":null,"dmin":0.299,"rms":1.03,"gap":117,"magType":"mww","type":"earthquake","title":"M 5.3 - 49km E of Tadine, New Caledonia"},"geometry":{"type":"Point","coordinates":[168.3516,-21.4756,10]},"id":"us2000c2mh"},
{"type":"Feature","properties":{"mag":4.5,"place":"284km ESE of Lambasa, Fiji","time":1512925145660,"updated":1513807483040,"tz":-720,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c4ze","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c4ze.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":312,"net":"us","code":"2000c4ze","ids":",us2000c4ze,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":7.446,"rms":0.87,"gap":79,"magType":"mb","type":"earthquake","title":"M 4.5 - 284km ESE of Lambasa, Fiji"},"geometry":{"type":"Point","coordinates":[-178.3773,-17.8205,552.62]},"id":"us2000c4ze"},
{"type":"Feature","properties":{"mag":4.5,"place":"121km NE of Raoul Island, New Zealand","time":1512919204800,"updated":1513800226040,"tz":-720,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c4za","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c4za.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":312,"net":"us","code":"2000c4za","ids":",us2000c4za,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":1.104,"rms":0.51,"gap":195,"magType":"mb","type":"earthquake","title":"M 4.5 - 121km NE of Raoul Island, New Zealand"},"geometry":{"type":"Point","coordinates":[-176.8811,-28.6287,31.56]},"id":"us2000c4za"},
{"type":"Feature","properties":{"mag":4.6,"place":"52km NW of Saumlaki, Indonesia","time":1512916987430,"updated":1513796806040,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c4zk","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c4zk.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":326,"net":"us","code":"2000c4zk","ids":",us2000c4zk,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":0.481,"rms":0.78,"gap":87,"magType":"mb","type":"earthquake","title":"M 4.6 - 52km NW of Saumlaki, Indonesia"},"geometry":{"type":"Point","coordinates":[130.9462,-7.6486,83.89]},"id":"us2000c4zk"},
{"type":"Feature","properties":{"mag":4.6,"place":"133km ENE of Raoul Island, New Zealand","time":1512916395870,"updated":1513721390040,"tz":-720,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c4z6","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c4z6.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":326,"net":"us","code":"2000c4z6","ids":",us2000c4z6,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":1.209,"rms":1.05,"gap":84,"magType":"mb","type":"earthquake","title":"M 4.6 - 133km ENE of Raoul Island, New Zealand"},"geometry":{"type":"Point","coordinates":[-176.712,-28.6735,35]},"id":"us2000c4z6"},
{"type":"Feature","properties":{"mag":5.3,"place":"Southeast Indian Ridge","time":1512885478620,"updated":1513877185040,"tz":420,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c2jd","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c2jd.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":432,"net":"us","code":"2000c2jd","ids":",us2000c2jd,","sources":",us,","types":",geoserve,moment-tensor,origin,phase-data,","nst":null,"dmin":18.077,"rms":0.7,"gap":83,"magType":"mb","type":"earthquake","title":"M 5.3 - Southeast Indian Ridge"},"geometry":{"type":"Point","coordinates":[104.4908,-48.2564,10]},"id":"us2000c2jd"},
{"type":"Feature","properties":{"mag":4.9,"place":"141km SE of Nikolski, Alaska","time":1512874724760,"updated":1513647128964,"tz":-660,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c2ig","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c2ig.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":369,"net":"us","code":"2000c2ig","ids":",ak17565006,us2000c2ig,","sources":",ak,us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":1.779,"rms":0.9,"gap":135,"magType":"mb","type":"earthquake","title":"M 4.9 - 141km SE of Nikolski, Alaska"},"geometry":{"type":"Point","coordinates":[-167.1628,52.208,7.98]},"id":"us2000c2ig"},
{"type":"Feature","properties":{"mag":4.5,"place":"62km W of Cauquenes, Chile","time":1512871770550,"updated":1512919457402,"tz":-240,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c2i0","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c2i0.geojson","felt":13,"cdi":4.3,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":317,"net":"us","code":"2000c2i0","ids":",us2000c2i0,","sources":",us,","types":",dyfi,geoserve,moment-tensor,origin,phase-data,","nst":null,"dmin":0.723,"rms":0.77,"gap":103,"magType":"mwr","type":"earthquake","title":"M 4.5 - 62km W of Cauquenes, Chile"},"geometry":{"type":"Point","coordinates":[-73.0078,-36.038,33.55]},"id":"us2000c2i0"},
{"type":"Feature","properties":{"mag":4.9,"place":"79km SW of Atka, Alaska","time":1512844656070,"updated":1513645909461,"tz":-720,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c2f3","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c2f3.geojson","felt":null,"cdi":null,"mmi":2.96,"alert":null,"status":"reviewed","tsunami":0,"sig":369,"net":"us","code":"2000c2f3","ids":",ak17559375,us2000c2f3,","sources":",ak,us,","types":",geoserve,origin,phase-data,shakemap,","nst":null,"dmin":0.64,"rms":0.8,"gap":78,"magType":"mb","type":"earthquake","title":"M 4.9 - 79km SW of Atka, Alaska"},"geometry":{"type":"Point","coordinates":[-175.1293,51.7626,51.72]},"id":"us2000c2f3"},
{"type":"Feature","properties":{"mag":4.5,"place":"7km NE of El Porvenir, Panama","time":1512833393760,"updated":1512936576022,"tz":-300,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c2dx","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c2dx.geojson","felt":12,"cdi":3.1,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":315,"net":"us","code":"2000c2dx","ids":",us2000c2dx,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":1.013,"rms":1.2,"gap":67,"magType":"mb","type":"earthquake","title":"M 4.5 - 7km NE of El Porvenir, Panama"},"geometry":{"type":"Point","coordinates":[-78.9168,9.6188,51.34]},"id":"us2000c2dx"},
{"type":"Feature","properties":{"mag":6.1,"place":"49km NW of Fais, Micronesia","time":1512832464520,"updated":1513202100040,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c2du","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c2du.geojson","felt":null,"cdi":null,"mmi":4.96,"alert":"green","status":"reviewed","tsunami":0,"sig":572,"net":"us","code":"2000c2du","ids":",us2000c2du,","sources":",us,","types":",geoserve,losspager,moment-tensor,origin,phase-data,shakemap,","nst":null,"dmin":5.736,"rms":1.32,"gap":82,"magType":"mww","type":"earthquake","title":"M 6.1 - 49km NW of Fais, Micronesia"},"geometry":{"type":"Point","coordinates":[140.2081,10.0901,10]},"id":"us2000c2du"},
{"type":"Feature","properties":{"mag":4.5,"place":"84km W of Tomatlan, Mexico","time":1512822105440,"updated":1513602221040,"tz":-420,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c2cw","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c2cw.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":312,"net":"us","code":"2000c2cw","ids":",us2000c2cw,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":4.331,"rms":0.92,"gap":190,"magType":"mb","type":"earthquake","title":"M 4.5 - 84km W of Tomatlan, Mexico"},"geometry":{"type":"Point","coordinates":[-106.0535,19.8912,34.51]},"id":"us2000c2cw"},
{"type":"Feature","properties":{"mag":4.6,"place":"98km SW of Leh, India","time":1512816188380,"updated":1512817459040,"tz":330,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c2cc","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c2cc.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":326,"net":"us","code":"2000c2cc","ids":",us2000c2cc,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":3.055,"rms":0.85,"gap":96,"magType":"mb","type":"earthquake","title":"M 4.6 - 98km SW of Leh, India"},"geometry":{"type":"Point","coordinates":[76.9222,33.4741,28.99]},"id":"us2000c2cc"},
{"type":"Feature","properties":{"mag":4.7,"place":"1km NNW of Cabacungan, Philippines","time":1512805153840,"updated":1512875447803,"tz":480,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c2bw","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c2bw.geojson","felt":2,"cdi":2.2,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":340,"net":"us","code":"2000c2bw","ids":",us2000c2bw,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":3.897,"rms":0.65,"gap":133,"magType":"mb","type":"earthquake","title":"M 4.7 - 1km NNW of Cabacungan, Philippines"},"geometry":{"type":"Point","coordinates":[124.9784,10.9462,53.59]},"id":"us2000c2bw"},
{"type":"Feature","properties":{"mag":4.5,"place":"39km WNW of San Antonio de los Cobres, Argentina","time":1512786095130,"updated":1513836432040,"tz":-180,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c29u","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c29u.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":312,"net":"us","code":"2000c29u","ids":",us2000c29u,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":1.781,"rms":0.84,"gap":39,"magType":"mb","type":"earthquake","title":"M 4.5 - 39km WNW of San Antonio de los Cobres, Argentina"},"geometry":{"type":"Point","coordinates":[-66.678,-24.0875,195.31]},"id":"us2000c29u"},
{"type":"Feature","properties":{"mag":4.8,"place":"61km NE of Norsup, Vanuatu","time":1512782122130,"updated":1513835995758,"tz":660,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c29n","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c29n.geojson","felt":1,"cdi":3.1,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":355,"net":"us","code":"2000c29n","ids":",us2000c29n,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":5.087,"rms":0.76,"gap":113,"magType":"mb","type":"earthquake","title":"M 4.8 - 61km NE of Norsup, Vanuatu"},"geometry":{"type":"Point","coordinates":[167.803,-15.6907,133.35]},"id":"us2000c29n"},
{"type":"Feature","properties":{"mag":5.7,"place":"29km SW of Hihifo, Tonga","time":1512776530870,"updated":1512972771050,"tz":-720,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c286","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c286.geojson","felt":1,"cdi":2,"mmi":4.03,"alert":"green","status":"reviewed","tsunami":0,"sig":500,"net":"us","code":"2000c286","ids":",pt17342003,us2000c286,","sources":",pt,us,","types":",dyfi,geoserve,losspager,moment-tensor,origin,phase-data,shakemap,","nst":null,"dmin":3.047,"rms":0.68,"gap":34,"magType":"mww","type":"earthquake","title":"M 5.7 - 29km SW of Hihifo, Tonga"},"geometry":{"type":"Point","coordinates":[-173.9502,-16.1312,129.33]},"id":"us2000c286"},
{"type":"Feature","properties":{"mag":4.5,"place":"107km WNW of Kabanjahe, Indonesia","time":1512754650700,"updated":1512838661040,"tz":420,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c23v","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c23v.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":312,"net":"us","code":"2000c23v","ids":",us2000c23v,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":1.992,"rms":1.05,"gap":44,"magType":"mb","type":"earthquake","title":"M 4.5 - 107km WNW of Kabanjahe, Indonesia"},"geometry":{"type":"Point","coordinates":[97.5447,3.3093,79.03]},"id":"us2000c23v"},
{"type":"Feature","properties":{"mag":4.5,"place":"78km SE of Modayag, Indonesia","time":1512749859070,"updated":1512751791040,"tz":480,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c22q","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c22q.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":312,"net":"us","code":"2000c22q","ids":",us2000c22q,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":2.446,"rms":1.1,"gap":72,"magType":"mb","type":"earthquake","title":"M 4.5 - 78km SE of Modayag, Indonesia"},"geometry":{"type":"Point","coordinates":[124.9637,0.3102,127.65]},"id":"us2000c22q"},
{"type":"Feature","properties":{"mag":4.5,"place":"Southeast Indian Ridge","time":1512745179860,"updated":1513584311040,"tz":420,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c4g3","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c4g3.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":312,"net":"us","code":"2000c4g3","ids":",us2000c4g3,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":17.273,"rms":0.45,"gap":148,"magType":"mb","type":"earthquake","title":"M 4.5 - Southeast Indian Ridge"},"geometry":{"type":"Point","coordinates":[108.5357,-48.9377,10]},"id":"us2000c4g3"},
{"type":"Feature","properties":{"mag":4.9,"place":"179km SSW of Ndoi Island, Fiji","time":1512736695660,"updated":1512737788040,"tz":-720,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c204","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c204.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":369,"net":"us","code":"2000c204","ids":",us2000c204,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":7.229,"rms":0.84,"gap":37,"magType":"mb","type":"earthquake","title":"M 4.9 - 179km SSW of Ndoi Island, Fiji"},"geometry":{"type":"Point","coordinates":[-179.4435,-22.1154,577.12]},"id":"us2000c204"},
{"type":"Feature","properties":{"mag":4.9,"place":"35km NW of Fais, Micronesia","time":1512734775430,"updated":1512736210040,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c202","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c202.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":369,"net":"us","code":"2000c202","ids":",us2000c202,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":5.783,"rms":0.58,"gap":99,"magType":"mb","type":"earthquake","title":"M 4.9 - 35km NW of Fais, Micronesia"},"geometry":{"type":"Point","coordinates":[140.2558,9.9537,10]},"id":"us2000c202"},
{"type":"Feature","properties":{"mag":4.7,"place":"115km ESE of Pondaguitan, Philippines","time":1512732155280,"updated":1512734261040,"tz":480,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c1zx","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c1zx.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":340,"net":"us","code":"2000c1zx","ids":",us2000c1zx,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":1.935,"rms":0.63,"gap":108,"magType":"mb","type":"earthquake","title":"M 4.7 - 115km ESE of Pondaguitan, Philippines"},"geometry":{"type":"Point","coordinates":[127.0556,5.7998,59.62]},"id":"us2000c1zx"},
{"type":"Feature","properties":{"mag":4.9,"place":"56km NW of Fais, Micronesia","time":1512730230220,"updated":1512732880040,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c1zv","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c1zv.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":369,"net":"us","code":"2000c1zv","ids":",us2000c1zv,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":5.695,"rms":0.72,"gap":89,"magType":"mb","type":"earthquake","title":"M 4.9 - 56km NW of Fais, Micronesia"},"geometry":{"type":"Point","coordinates":[140.2017,10.1661,10]},"id":"us2000c1zv"},
{"type":"Feature","properties":{"mag":6.4,"place":"50km WNW of Fais, Micronesia","time":1512726670300,"updated":1513729855666,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c1zn","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c1zn.geojson","felt":1,"cdi":1,"mmi":6.08,"alert":"green","status":"reviewed","tsunami":1,"sig":630,"net":"us","code":"2000c1zn","ids":",us2000c1zn,pt17342002,at00p0mzdc,","sources":",us,pt,at,","types":",dyfi,geoserve,impact-link,losspager,moment-tensor,origin,phase-data,shakemap,","nst":null,"dmin":5.845,"rms":1.14,"gap":38,"magType":"mww","type":"earthquake","title":"M 6.4 - 50km WNW of Fais, Micronesia"},"geometry":{"type":"Point","coordinates":[140.1315,10.009,20.27]},"id":"us2000c1zn"},
{"type":"Feature","properties":{"mag":5.5,"place":"49km WNW of Fais, Micronesia","time":1512711474660,"updated":1513268616040,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c1yh","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c1yh.geojson","felt":null,"cdi":null,"mmi":3.96,"alert":"green","status":"reviewed","tsunami":0,"sig":465,"net":"us","code":"2000c1yh","ids":",us2000c1yh,","sources":",us,","types":",geoserve,losspager,moment-tensor,origin,phase-data,shakemap,","nst":null,"dmin":5.865,"rms":0.77,"gap":47,"magType":"mb","type":"earthquake","title":"M 5.5 - 49km WNW of Fais, Micronesia"},"geometry":{"type":"Point","coordinates":[140.1236,9.9851,10]},"id":"us2000c1yh"},
{"type":"Feature","properties":{"mag":4.5,"place":"23km WNW of Emponas, Greece","time":1512710441010,"updated":1512716470744,"tz":120,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c1yf","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c1yf.geojson","felt":1,"cdi":2,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":312,"net":"us","code":"2000c1yf","ids":",us2000c1yf,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":0.421,"rms":0.96,"gap":101,"magType":"mb","type":"earthquake","title":"M 4.5 - 23km WNW of Emponas, Greece"},"geometry":{"type":"Point","coordinates":[27.614,36.3114,10]},"id":"us2000c1yf"},
{"type":"Feature","properties":{"mag":4.8,"place":"56km W of Yonakuni, Japan","time":1512704670130,"updated":1513825705204,"tz":480,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c1xu","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c1xu.geojson","felt":1,"cdi":2.7,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":355,"net":"us","code":"2000c1xu","ids":",us2000c1xu,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":0.513,"rms":0.72,"gap":65,"magType":"mb","type":"earthquake","title":"M 4.8 - 56km W of Yonakuni, Japan"},"geometry":{"type":"Point","coordinates":[122.4493,24.4264,73.65]},"id":"us2000c1xu"},
{"type":"Feature","properties":{"mag":5,"place":"28km SE of Kodari, Nepal","time":1512701478860,"updated":1513825483132,"tz":345,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c1xk","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c1xk.geojson","felt":20,"cdi":4.2,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":393,"net":"us","code":"2000c1xk","ids":",us2000c1xk,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":4.781,"rms":0.68,"gap":40,"magType":"mb","type":"earthquake","title":"M 5.0 - 28km SE of Kodari, Nepal"},"geometry":{"type":"Point","coordinates":[86.1471,27.7618,10]},"id":"us2000c1xk"},
{"type":"Feature","properties":{"mag":4.7,"place":"36km NNW of Fais, Micronesia","time":1512699085950,"updated":1513825103040,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c1xg","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c1xg.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":340,"net":"us","code":"2000c1xg","ids":",us2000c1xg,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":5.642,"rms":0.71,"gap":76,"magType":"mb","type":"earthquake","title":"M 4.7 - 36km NNW of Fais, Micronesia"},"geometry":{"type":"Point","coordinates":[140.3559,10.0573,39.46]},"id":"us2000c1xg"},
{"type":"Feature","properties":{"mag":5.9,"place":"104km NNE of L'Esperance Rock, New Zealand","time":1512698997430,"updated":1513825169950,"tz":-720,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c1xc","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c1xc.geojson","felt":null,"cdi":null,"mmi":4.33,"alert":"green","status":"reviewed","tsunami":0,"sig":536,"net":"us","code":"2000c1xc","ids":",us2000c1xc,","sources":",us,","types":",geoserve,impact-text,losspager,moment-tensor,origin,phase-data,shakemap,","nst":null,"dmin":1.394,"rms":1.12,"gap":54,"magType":"mww","type":"earthquake","title":"M 5.9 - 104km NNE of L'Esperance Rock, New Zealand"},"geometry":{"type":"Point","coordinates":[-178.4924,-30.5548,12]},"id":"us2000c1xc"},
{"type":"Feature","properties":{"mag":4.7,"place":"220km WNW of Ile Hunter, New Caledonia","time":1512694039050,"updated":1513307814040,"tz":660,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c4ff","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c4ff.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":340,"net":"us","code":"2000c4ff","ids":",us2000c4ff,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":1.904,"rms":1.12,"gap":170,"magType":"mb","type":"earthquake","title":"M 4.7 - 220km WNW of Ile Hunter, New Caledonia"},"geometry":{"type":"Point","coordinates":[170.0683,-21.6533,34.86]},"id":"us2000c4ff"},
{"type":"Feature","properties":{"mag":5,"place":"90km NW of Fais, Micronesia","time":1512693011340,"updated":1513310828040,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c4fe","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c4fe.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":385,"net":"us","code":"2000c4fe","ids":",us2000c4fe,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":7.52,"rms":0.56,"gap":57,"magType":"mb","type":"earthquake","title":"M 5.0 - 90km NW of Fais, Micronesia"},"geometry":{"type":"Point","coordinates":[139.9243,10.3279,10]},"id":"us2000c4fe"},
{"type":"Feature","properties":{"mag":6.4,"place":"50km NW of Fais, Micronesia","time":1512692574200,"updated":1512866535648,"tz":540,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c1wt","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c1wt.geojson","felt":null,"cdi":null,"mmi":5.29,"alert":"green","status":"reviewed","tsunami":1,"sig":630,"net":"us","code":"2000c1wt","ids":",pt17342000,us2000c1wt,at00p0m19s,","sources":",pt,us,at,","types":",geoserve,impact-link,losspager,moment-tensor,origin,phase-data,shakemap,","nst":null,"dmin":5.711,"rms":0.76,"gap":13,"magType":"mww","type":"earthquake","title":"M 6.4 - 50km NW of Fais, Micronesia"},"geometry":{"type":"Point","coordinates":[140.2197,10.1164,12.79]},"id":"us2000c1wt"},
{"type":"Feature","properties":{"mag":4.9,"place":"Kuril Islands","time":1512688594610,"updated":1512865446040,"tz":600,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c1wd","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c1wd.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":369,"net":"us","code":"2000c1wd","ids":",us2000c1wd,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":6.44,"rms":1.03,"gap":76,"magType":"mb","type":"earthquake","title":"M 4.9 - Kuril Islands"},"geometry":{"type":"Point","coordinates":[152.8896,47.4577,20.77]},"id":"us2000c1wd"},
{"type":"Feature","properties":{"mag":5.3,"place":"80km NNE of Hihifo, Tonga","time":1512688200480,"updated":1512963605281,"tz":-720,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c1w5","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c1w5.geojson","felt":1,"cdi":2.7,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":432,"net":"us","code":"2000c1w5","ids":",us2000c1w5,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":5.071,"rms":0.8,"gap":45,"magType":"mb","type":"earthquake","title":"M 5.3 - 80km NNE of Hihifo, Tonga"},"geometry":{"type":"Point","coordinates":[-173.4664,-15.2772,10]},"id":"us2000c1w5"},
{"type":"Feature","properties":{"mag":5.1,"place":"194km NW of Lautoka, Fiji","time":1512687717060,"updated":1512865241040,"tz":720,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c1w0","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c1w0.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":400,"net":"us","code":"2000c1w0","ids":",us2000c1w0,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":8.535,"rms":0.74,"gap":115,"magType":"mb","type":"earthquake","title":"M 5.1 - 194km NW of Lautoka, Fiji"},"geometry":{"type":"Point","coordinates":[176.029,-16.5312,10]},"id":"us2000c1w0"},
{"type":"Feature","properties":{"mag":4.7,"place":"92km W of El Aguilar, Argentina","time":1512675087540,"updated":1513720568040,"tz":-180,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c1r2","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c1r2.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":340,"net":"us","code":"2000c1r2","ids":",us2000c1r2,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":1.478,"rms":1.06,"gap":31,"magType":"mb","type":"earthquake","title":"M 4.7 - 92km W of El Aguilar, Argentina"},"geometry":{"type":"Point","coordinates":[-66.5878,-23.1456,209.79]},"id":"us2000c1r2"},
{"type":"Feature","properties":{"mag":4.5,"place":"205km ENE of Tairua, New Zealand","time":1512673139920,"updated":1513720796040,"tz":720,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c4ew","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c4ew.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":312,"net":"us","code":"2000c4ew","ids":",us2000c4ew,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":2.497,"rms":0.75,"gap":259,"magType":"mb","type":"earthquake","title":"M 4.5 - 205km ENE of Tairua, New Zealand"},"geometry":{"type":"Point","coordinates":[177.8143,-36.0535,10]},"id":"us2000c4ew"},
{"type":"Feature","properties":{"mag":4.5,"place":"6km WSW of Grebocice, Poland","time":1512668570660,"updated":1513720519986,"tz":60,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c1p3","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c1p3.geojson","felt":1,"cdi":5.8,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":312,"net":"us","code":"2000c1p3","ids":",us2000c1p3,","sources":",us,","types":",dyfi,geoserve,origin,phase-data,","nst":null,"dmin":1.94,"rms":1.43,"gap":38,"magType":"mb","type":"earthquake","title":"M 4.5 - 6km WSW of Grebocice, Poland"},"geometry":{"type":"Point","coordinates":[16.0717,51.5822,10]},"id":"us2000c1p3"},
{"type":"Feature","properties":{"mag":5.3,"place":"89km W of Kuripan, Indonesia","time":1512659795140,"updated":1512829399040,"tz":420,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c1lm","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c1lm.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":1,"sig":432,"net":"us","code":"2000c1lm","ids":",us2000c1lm,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":0.692,"rms":0.94,"gap":22,"magType":"mb","type":"earthquake","title":"M 5.3 - 89km W of Kuripan, Indonesia"},"geometry":{"type":"Point","coordinates":[102.9565,-5.058,52.44]},"id":"us2000c1lm"},
{"type":"Feature","properties":{"mag":4.8,"place":"80km E of Shikotan, Russia","time":1512628725560,"updated":1512631641040,"tz":600,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c1he","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c1he.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":354,"net":"us","code":"2000c1he","ids":",us2000c1he,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":3.698,"rms":0.71,"gap":134,"magType":"mb","type":"earthquake","title":"M 4.8 - 80km E of Shikotan, Russia"},"geometry":{"type":"Point","coordinates":[147.7129,43.9176,35]},"id":"us2000c1he"},
{"type":"Feature","properties":{"mag":4.6,"place":"68km SW of Ile Hunter, New Caledonia","time":1512625554040,"updated":1512629507040,"tz":660,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c1gn","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c1gn.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":326,"net":"us","code":"2000c1gn","ids":",us2000c1gn,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":3.557,"rms":0.3,"gap":123,"magType":"mb","type":"earthquake","title":"M 4.6 - 68km SW of Ile Hunter, New Caledonia"},"geometry":{"type":"Point","coordinates":[171.5788,-22.8434,35]},"id":"us2000c1gn"},
{"type":"Feature","properties":{"mag":4.9,"place":"60km WSW of Ile Hunter, New Caledonia","time":1512623432820,"updated":1512627421040,"tz":660,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c1g2","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c1g2.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":369,"net":"us","code":"2000c1g2","ids":",us2000c1g2,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":3.476,"rms":0.48,"gap":122,"magType":"mb","type":"earthquake","title":"M 4.9 - 60km WSW of Ile Hunter, New Caledonia"},"geometry":{"type":"Point","coordinates":[171.5491,-22.6859,35]},"id":"us2000c1g2"},
{"type":"Feature","properties":{"mag":4.6,"place":"Southeast Indian Ridge","time":1512617871990,"updated":1512618905040,"tz":420,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000c1fa","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000c1fa.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":326,"net":"us","code":"2000c1fa","ids":",us2000c1fa,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":18.228,"rms":0.54,"gap":102,"magType":"mb","type":"earthquake","title":"M 4.6 - Southeast Indian Ridge"},"geometry":{"type":"Point","coordinates":[104.9341,-48.3389,10]},"id":"us2000c1fa"},
{"type":"Feature","properties":{"mag":4.7,"place":"56km W of Zhamog, China","time":1511421227230,"updated":1512913849040,"tz":480,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/us2000btfh","detail":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us2000btfh.geojson","felt":null,"cdi":null,"mmi":null,"alert":null,"status":"reviewed","tsunami":0,"sig":340,"net":"us","code":"2000btfh","ids":",us2000btfh,","sources":",us,","types":",geoserve,origin,phase-data,","nst":null,"dmin":3.529,"rms":0.74,"gap":53,"magType":"mb","type":"earthquake","title":"M 4.7 - 56km W of Zhamog, China"},"geometry":{"type":"Point","coordinates":[95.1799,29.9261,10]},"id":"us2000btfh"}],"bbox":[-179.5727,-59.6554,0,178.7203,72.5993,628.42]}

Site.DataManager = function(){
  var self = this;
  var url = "/js/earthquakes.json"
  this.earthquakes = [];
  this.loadSignal = new BK.Signal();

  this.load = function() {
    for (var i=0; i<earthquakesJSON.features.length; i++) {
      var feature = earthquakesJSON.features[i];
      self.earthquakes.push(new Site.DataManager.Earthquake(feature));
    }

    self.loadSignal.fire();
  }
}

Site.DataManager.Earthquake = function(data) {
  this.magnitude = data.mag;
  this.desc = data.place;
  this.data = data;

  var coords = data.geometry.coordinates;
  this.latLng = new GK.LatLng(coords[1], coords[0]);
  this.pos = GK.LatLng.toWorld(this.latLng);
}

/*////////////////////////////////////
ModelManager
////////////////////////////////////*/

Site.ModelManager = function(){
  var self = this;

  this.loadSignal = new BK.Signal();
  this.loaded = false;
  this.models = {};

  this.models.background = new GK.Model(
      new Float32Array([1, -1, -0.018804499879479408, 0.039283301681280136, 0.03966140002012253, 0.9984409809112549, 0.9998999834060669, 0.00009998000314226374, 0.763966977596283, -0.763966977596283, -0.018893899396061897, 0.039283301681280136, 0.03966140002012253, 0.9984409809112549, 0.8819069862365723, 0.11809299886226654, 0.5102729797363281, -1, 0.00046364200534299016, 0.039283301681280136, 0.03966140002012253, 0.9984409809112549, 0.801364004611969, 0.00009998000314226374, 1, -1, -0.018804499879479408, 0.0011788499541580677, 0.0015574999852105975, 0.9999979734420776, 0.9998999834060669, 0.00009998000314226374, 1, -0.5159580111503601, -0.01955839991569519, 0.0011788499541580677, 0.0015574999852105975, 0.9999979734420776, 0.9998999834060669, 0.24207299947738647, 0.763966977596283, -0.763966977596283, -0.018893899396061897, 0.0011788499541580677, 0.0015574999852105975, 0.9999979734420776, 0.8819069862365723, 0.11809299886226654, -0.0004537109925877303, 0.0004537109925877303, -5.408649916827102e-11, -0.025564899668097496, -0.04469209909439087, 0.9986739754676819, 0.4997729957103729, 0.5002269744873047, 0.2806049883365631, 0.2391510009765625, 0.017876800149679184, -0.025564899668097496, -0.04469209909439087, 0.9986739754676819, 0.6307700276374817, 0.6311050057411194, 0.0035657400730997324, 0.48717200756073, 0.021884199231863022, -0.025564899668097496, -0.04469209909439087, 0.9986739754676819, 0.501783013343811, 0.7435370087623596, -1, -1, 1.1920899822825959e-7, 0.06866840273141861, -0.07191409915685654, 0.9950439929962158, 0.0001000400006887503, 0.00009998000314226374, -0.48376700282096863, -0.507066011428833, 6.044700029406158e-8, 0.06866840273141861, -0.07191409915685654, 0.9950439929962158, 0.2528209984302521, 0.2530499994754791, -1, -0.5314339995384216, 0.033864498138427734, 0.06866840273141861, -0.07191409915685654, 0.9950439929962158, 0.00010002600174630061, 0.2343360036611557, -0.0004537109925877303, 0.0004537109925877303, -5.408649916827102e-11, -0.011027299799025059, -0.06176140159368515, 0.9980300068855286, 0.4997729957103729, 0.5002269744873047, 0.5319920182228088, 0.0021256599575281143, 0.005986509844660759, -0.011027299799025059, -0.06176140159368515, 0.9980300068855286, 0.7659429907798767, 0.5010629892349243, 0.2806049883365631, 0.2391510009765625, 0.017876800149679184, -0.011027299799025059, -0.06176140159368515, 0.9980300068855286, 0.6307700276374817, 0.6311050057411194, -0.010863900184631348, -1, 1.1920899822825959e-7, -0.17915700376033783, 0.0018643300281837583, 0.9838190078735352, 0.49456900358200073, 0.00009998000314226374, -0.005819350015372038, -0.515201985836029, 6.141689823380148e-8, -0.17915700376033783, 0.0018643300281837583, 0.9838190078735352, 0.49709099531173706, 0.2424509972333908, -0.239996999502182, -0.7611619830131531, -0.042178500443696976, -0.17915700376033783, 0.0018643300281837583, 0.9838190078735352, 0.3774360120296478, 0.12266100198030472, -1, -0.004533649887889624, -0.07623569667339325, -0.23869800567626953, -0.19088000059127808, 0.952148973941803, 0.00010001000191550702, 0.497734010219574, -0.5015019774436951, -0.0020463198889046907, 0.04923360049724579, -0.23869800567626953, -0.19088000059127808, 0.952148973941803, 0.24929900467395782, 0.49897700548171997, -0.7353860139846802, 0.2528130114078522, 0.041692301630973816, -0.23869800567626953, -0.19088000059127808, 0.952148973941803, 0.13237999379634857, 0.6139479875564575, 0.00780081981793046, 1, -1.1920899822825959e-7, -0.12946000695228577, 0.14225000143051147, 0.981328010559082, 0.5038999915122986, 0.9998999834060669, -0.4572199881076813, 1, -0.06134700030088425, -0.12946000695228577, 0.14225000143051147, 0.981328010559082, 0.27143600583076477, 0.9998999834060669, -0.46525898575782776, 0.39380401372909546, 0.025464599952101707, -0.12946000695228577, 0.14225000143051147, 0.981328010559082, 0.2674170136451721, 0.7325829863548279, 0.00780081981793046, 1, -1.1920899822825959e-7, 0.07504349946975708, 0.23418299853801727, 0.9692919850349426, 0.5038999915122986, 0.9998999834060669, 0.2689729928970337, 0.7334740161895752, 0.04417270049452782, 0.07504349946975708, 0.23418299853801727, 0.9692919850349426, 0.6344599723815918, 0.8666639924049377, 0.5453019738197327, 1, -0.041613899171352386, 0.07504349946975708, 0.23418299853801727, 0.9692919850349426, 0.772596001625061, 0.9998999834060669, 0.5204560160636902, 0.4913730025291443, 0.021623600274324417, 0.07418379932641983, -0.04626129940152168, 0.9961709976196289, 0.7492709755897522, 0.7494990229606628, 0.7514219880104065, 0.24063999950885773, -0.007220109924674034, 0.07418379932641983, -0.04626129940152168, 0.9961709976196289, 0.8800010085105896, 0.6202960014343262, 0.7580779790878296, 0.737500011920929, 0.015358000062406063, 0.07418379932641983, -0.04626129940152168, 0.9961709976196289, 0.8685569763183594, 0.8686760067939758, 0.50416499376297, -0.50416499376297, -0.014809999614953995, 0.01706390082836151, -0.041971899569034576, 0.99897301197052, 0.7520319819450378, 0.24796800315380096, 0.7471569776535034, -0.2553279995918274, -0.00850577000528574, 0.01706390082836151, -0.041971899569034576, 0.99897301197052, 0.8735039830207825, 0.3723610043525696, 0.5319920182228088, 0.0021256599575281143, 0.005986509844660759, 0.01706390082836151, -0.041971899569034576, 0.99897301197052, 0.7659429907798767, 0.5010629892349243, -0.010863900184631348, -1, 1.1920899822825959e-7, 0.008925040252506733, -0.00009274970216210932, 0.9999600052833557, 0.49456900358200073, 0.00009998000314226374, 0.25777098536491394, -0.7413769960403442, -0.0023735600989311934, 0.008925040252506733, -0.00009274970216210932, 0.9999600052833557, 0.6288599967956543, 0.12938599288463593, -0.005819350015372038, -0.515201985836029, 6.141689823380148e-8, 0.008925040252506733, -0.00009274970216210932, 0.9999600052833557, 0.49709099531173706, 0.2424509972333908, -0.48376700282096863, -0.507066011428833, 6.044700029406158e-8, 0.24871300160884857, 0.0783545970916748, 0.9654030203819275, 0.2528209984302521, 0.2530499994754791, -0.4982599914073944, -1, 0.04374169930815697, 0.24871300160884857, 0.0783545970916748, 0.9654030203819275, 0.25091999769210815, 0.00009998000314226374, -0.239996999502182, -0.7611619830131531, -0.042178500443696976, 0.24871300160884857, 0.0783545970916748, 0.9654030203819275, 0.3774360120296478, 0.12266100198030472, -1, -0.004533649887889624, -0.07623569667339325, -0.24231299757957458, -0.10256200283765793, 0.9647619724273682, 0.00010001000191550702, 0.497734010219574, -0.48376700282096863, -0.507066011428833, 6.044700029406158e-8, -0.24231299757957458, -0.10256200283765793, 0.9647619724273682, 0.2528209984302521, 0.2530499994754791, -0.5015019774436951, -0.0020463198889046907, 0.04923360049724579, -0.24231299757957458, -0.10256200283765793, 0.9647619724273682, 0.24929900467395782, 0.49897700548171997, -0.7353860139846802, 0.2528130114078522, 0.041692301630973816, 0.014043400064110756, 0.18641500174999237, 0.9823709726333618, 0.13237999379634857, 0.6139479875564575, -0.7218970060348511, 0.7166489958763123, -0.046518001705408096, 0.014043400064110756, 0.18641500174999237, 0.9823709726333618, 0.13242000341415405, 0.867579996585846, -1, 0.46531298756599426, 0.0051511600613594055, 0.014043400064110756, 0.18641500174999237, 0.9823709726333618, 0.00009999590110965073, 0.7326099872589111, -0.46525898575782776, 0.39380401372909546, 0.025464599952101707, -0.0008622839814051986, 0.042642101645469666, 0.9990900158882141, 0.2674170136451721, 0.7325829863548279, 0.0035657400730997324, 0.48717200756073, 0.021884199231863022, -0.0008622839814051986, 0.042642101645469666, 0.9990900158882141, 0.501783013343811, 0.7435370087623596, 0.00780081981793046, 1, -1.1920899822825959e-7, -0.0008622839814051986, 0.042642101645469666, 0.9990900158882141, 0.5038999915122986, 0.9998999834060669, -0.48376700282096863, -0.507066011428833, 6.044700029406158e-8, -0.002533579943701625, -0.14884500205516815, 0.9888569712638855, 0.2528209984302521, 0.2530499994754791, -0.005819350015372038, -0.515201985836029, 6.141689823380148e-8, -0.002533579943701625, -0.14884500205516815, 0.9888569712638855, 0.49709099531173706, 0.2424509972333908, -0.2326209992170334, -0.27483800053596497, 0.0355990007519722, -0.002533579943701625, -0.14884500205516815, 0.9888569712638855, 0.3837130069732666, 0.3840610086917877, -0.5015019774436951, -0.0020463198889046907, 0.04923360049724579, -0.04967249929904938, -0.09863629937171936, 0.9938830137252808, 0.24929900467395782, 0.49897700548171997, -0.48376700282096863, -0.507066011428833, 6.044700029406158e-8, -0.04967249929904938, -0.09863629937171936, 0.9938830137252808, 0.2528209984302521, 0.2530499994754791, -0.2326209992170334, -0.27483800053596497, 0.0355990007519722, -0.04967249929904938, -0.09863629937171936, 0.9938830137252808, 0.3837130069732666, 0.3840610086917877, -1, -0.5314339995384216, 0.033864498138427734, 0.05447639897465706, 0.20423699915409088, 0.9774050116539001, 0.00010002600174630061, 0.2343360036611557, -0.48376700282096863, -0.507066011428833, 6.044700029406158e-8, 0.05447639897465706, 0.20423699915409088, 0.9774050116539001, 0.2528209984302521, 0.2530499994754791, -1, -0.004533649887889624, -0.07623569667339325, 0.05447639897465706, 0.20423699915409088, 0.9774050116539001, 0.00010001000191550702, 0.497734010219574, -0.4982599914073944, -1, 0.04374169930815697, -0.08649320155382156, 0.09058170020580292, 0.9921259880065918, 0.25091999769210815, 0.00009998000314226374, -0.48376700282096863, -0.507066011428833, 6.044700029406158e-8, -0.08649320155382156, 0.09058170020580292, 0.9921259880065918, 0.2528209984302521, 0.2530499994754791, -1, -1, 1.1920899822825959e-7, -0.08649320155382156, 0.09058170020580292, 0.9921259880065918, 0.0001000400006887503, 0.00009998000314226374, 0.5319920182228088, 0.0021256599575281143, 0.005986509844660759, -0.011247600428760052, 0.0015489199431613088, 0.9999359846115112, 0.7659429907798767, 0.5010629892349243, -0.0004537109925877303, 0.0004537109925877303, -5.408649916827102e-11, -0.011247600428760052, 0.0015489199431613088, 0.9999359846115112, 0.4997729957103729, 0.5002269744873047, 0.2520720064640045, -0.2799060046672821, 0.003274759976193309, -0.011247600428760052, 0.0015489199431613088, 0.9999359846115112, 0.6399250030517578, 0.3600749969482422, -0.2326209992170334, -0.27483800053596497, 0.0355990007519722, 0.15341100096702576, -0.0015961900353431702, 0.988161027431488, 0.3837130069732666, 0.3840610086917877, -0.005819350015372038, -0.515201985836029, 6.141689823380148e-8, 0.15341100096702576, -0.0015961900353431702, 0.988161027431488, 0.49709099531173706, 0.2424509972333908, -0.0004537109925877303, 0.0004537109925877303, -5.408649916827102e-11, 0.15341100096702576, -0.0015961900353431702, 0.988161027431488, 0.4997729957103729, 0.5002269744873047, 0.5204560160636902, 0.4913730025291443, 0.021623600274324417, 0.09212049841880798, -0.029639199376106262, 0.9953070282936096, 0.7492709755897522, 0.7494990229606628, 0.5319920182228088, 0.0021256599575281143, 0.005986509844660759, 0.09212049841880798, -0.029639199376106262, 0.9953070282936096, 0.7659429907798767, 0.5010629892349243, 0.7514219880104065, 0.24063999950885773, -0.007220109924674034, 0.09212049841880798, -0.029639199376106262, 0.9953070282936096, 0.8800010085105896, 0.6202960014343262, -0.005819350015372038, -0.515201985836029, 6.141689823380148e-8, 0.030007800087332726, -0.046785298734903336, 0.9984539747238159, 0.49709099531173706, 0.2424509972333908, 0.50416499376297, -0.50416499376297, -0.014809999614953995, 0.030007800087332726, -0.046785298734903336, 0.9984539747238159, 0.7520319819450378, 0.24796800315380096, 0.2520720064640045, -0.2799060046672821, 0.003274759976193309, 0.030007800087332726, -0.046785298734903336, 0.9984539747238159, 0.6399250030517578, 0.3600749969482422, -0.2326209992170334, -0.27483800053596497, 0.0355990007519722, 0.09745600074529648, 0.046369101852178574, 0.9941589832305908, 0.3837130069732666, 0.3840610086917877, -0.0004537109925877303, 0.0004537109925877303, -5.408649916827102e-11, 0.09745600074529648, 0.046369101852178574, 0.9941589832305908, 0.4997729957103729, 0.5002269744873047, -0.5015019774436951, -0.0020463198889046907, 0.04923360049724579, 0.09745600074529648, 0.046369101852178574, 0.9941589832305908, 0.24929900467395782, 0.49897700548171997, 0.0035657400730997324, 0.48717200756073, 0.021884199231863022, 0.01659959927201271, -0.045048099011182785, 0.9988470077514648, 0.501783013343811, 0.7435370087623596, -0.46525898575782776, 0.39380401372909546, 0.025464599952101707, 0.01659959927201271, -0.045048099011182785, 0.9988470077514648, 0.2674170136451721, 0.7325829863548279, -0.0004537109925877303, 0.0004537109925877303, -5.408649916827102e-11, 0.01659959927201271, -0.045048099011182785, 0.9988470077514648, 0.4997729957103729, 0.5002269744873047, 0.0035657400730997324, 0.48717200756073, 0.021884199231863022, -0.12346400320529938, 0.04332660138607025, 0.9914029836654663, 0.501783013343811, 0.7435370087623596, 0.2689729928970337, 0.7334740161895752, 0.04417270049452782, -0.12346400320529938, 0.04332660138607025, 0.9914029836654663, 0.6344599723815918, 0.8666639924049377, 0.00780081981793046, 1, -1.1920899822825959e-7, -0.12346400320529938, 0.04332660138607025, 0.9914029836654663, 0.5038999915122986, 0.9998999834060669, -0.46525898575782776, 0.39380401372909546, 0.025464599952101707, 0.09741339832544327, 0.05076320096850395, 0.9939489960670471, 0.2674170136451721, 0.7325829863548279, -0.5015019774436951, -0.0020463198889046907, 0.04923360049724579, 0.09741339832544327, 0.05076320096850395, 0.9939489960670471, 0.24929900467395782, 0.49897700548171997, -0.0004537109925877303, 0.0004537109925877303, -5.408649916827102e-11, 0.09741339832544327, 0.05076320096850395, 0.9939489960670471, 0.4997729957103729, 0.5002269744873047, 0.2689729928970337, 0.7334740161895752, 0.04417270049452782, 0.0012455900432541966, -0.09145530313253403, 0.9958080053329468, 0.6344599723815918, 0.8666639924049377, 0.0035657400730997324, 0.48717200756073, 0.021884199231863022, 0.0012455900432541966, -0.09145530313253403, 0.9958080053329468, 0.501783013343811, 0.7435370087623596, 0.5204560160636902, 0.4913730025291443, 0.021623600274324417, 0.0012455900432541966, -0.09145530313253403, 0.9958080053329468, 0.7492709755897522, 0.7494990229606628, 0.5319920182228088, 0.0021256599575281143, 0.005986509844660759, 0.052351098507642746, -0.012457099743187428, 0.9985510110855103, 0.7659429907798767, 0.5010629892349243, 0.7471569776535034, -0.2553279995918274, -0.00850577000528574, 0.052351098507642746, -0.012457099743187428, 0.9985510110855103, 0.8735039830207825, 0.3723610043525696, 0.9795349836349487, 0.0035952299367636442, -0.01745850034058094, 0.052351098507642746, -0.012457099743187428, 0.9985510110855103, 0.9998999834060669, 0.5017970204353333, 0.2520720064640045, -0.2799060046672821, 0.003274759976193309, 0.03350700065493584, -0.04285699874162674, 0.9985190033912659, 0.6399250030517578, 0.3600749969482422, 0.50416499376297, -0.50416499376297, -0.014809999614953995, 0.03350700065493584, -0.04285699874162674, 0.9985190033912659, 0.7520319819450378, 0.24796800315380096, 0.5319920182228088, 0.0021256599575281143, 0.005986509844660759, 0.03350700065493584, -0.04285699874162674, 0.9985190033912659, 0.7659429907798767, 0.5010629892349243, 0.763966977596283, -0.763966977596283, -0.018893899396061897, 0.009426319971680641, -0.006291859783232212, 0.9999359846115112, 0.8819069862365723, 0.11809299886226654, 1, -0.5159580111503601, -0.01955839991569519, 0.009426319971680641, -0.006291859783232212, 0.9999359846115112, 0.9998999834060669, 0.24207299947738647, 0.50416499376297, -0.50416499376297, -0.014809999614953995, 0.009426319971680641, -0.006291859783232212, 0.9999359846115112, 0.7520319819450378, 0.24796800315380096, 0.7471569776535034, -0.2553279995918274, -0.00850577000528574, 0.0411859005689621, -0.002415969967842102, 0.9991490244865417, 0.8735039830207825, 0.3723610043525696, 1, -0.5159580111503601, -0.01955839991569519, 0.0411859005689621, -0.002415969967842102, 0.9991490244865417, 0.9998999834060669, 0.24207299947738647, 0.9795349836349487, 0.0035952299367636442, -0.01745850034058094, 0.0411859005689621, -0.002415969967842102, 0.9991490244865417, 0.9998999834060669, 0.5017970204353333, 0.2806049883365631, 0.2391510009765625, 0.017876800149679184, 0.017542200163006783, -0.03152700141072273, 0.9993489980697632, 0.6307700276374817, 0.6311050057411194, 0.5319920182228088, 0.0021256599575281143, 0.005986509844660759, 0.017542200163006783, -0.03152700141072273, 0.9993489980697632, 0.7659429907798767, 0.5010629892349243, 0.5204560160636902, 0.4913730025291443, 0.021623600274324417, 0.017542200163006783, -0.03152700141072273, 0.9993489980697632, 0.7492709755897522, 0.7494990229606628, 0.5453019738197327, 1, -0.041613899171352386, 0.054799001663923264, 0.2540000081062317, 0.9656509757041931, 0.772596001625061, 0.9998999834060669, 0.2689729928970337, 0.7334740161895752, 0.04417270049452782, 0.054799001663923264, 0.2540000081062317, 0.9656509757041931, 0.6344599723815918, 0.8666639924049377, 0.7580779790878296, 0.737500011920929, 0.015358000062406063, 0.054799001663923264, 0.2540000081062317, 0.9656509757041931, 0.8685569763183594, 0.8686760067939758, 0.7580779790878296, 0.737500011920929, 0.015358000062406063, -0.09729419648647308, 0.1351419985294342, 0.9860380291938782, 0.8685569763183594, 0.8686760067939758, 1, 1, 0.0032520201057195663, -0.09729419648647308, 0.1351419985294342, 0.9860380291938782, 0.9998999834060669, 0.9998999834060669, 0.5453019738197327, 1, -0.041613899171352386, -0.09729419648647308, 0.1351419985294342, 0.9860380291938782, 0.772596001625061, 0.9998999834060669, 0.0035657400730997324, 0.48717200756073, 0.021884199231863022, 0.0006298290099948645, -0.015452099964022636, 0.9998800158500671, 0.501783013343811, 0.7435370087623596, 0.2806049883365631, 0.2391510009765625, 0.017876800149679184, 0.0006298290099948645, -0.015452099964022636, 0.9998800158500671, 0.6307700276374817, 0.6311050057411194, 0.5204560160636902, 0.4913730025291443, 0.021623600274324417, 0.0006298290099948645, -0.015452099964022636, 0.9998800158500671, 0.7492709755897522, 0.7494990229606628, 0.7580779790878296, 0.737500011920929, 0.015358000062406063, 0.05301409959793091, -0.0028051401022821665, 0.9985899925231934, 0.8685569763183594, 0.8686760067939758, 1, 0.45974001288414, 0.0017343700164929032, 0.05301409959793091, -0.0028051401022821665, 0.9985899925231934, 0.9998999834060669, 0.7298240065574646, 1, 1, 0.0032520201057195663, 0.05301409959793091, -0.0028051401022821665, 0.9985899925231934, 0.9998999834060669, 0.9998999834060669, 1, 0.45974001288414, 0.0017343700164929032, 0.0011066800216212869, -0.04208869859576225, 0.9991130232810974, 0.9998999834060669, 0.7298240065574646, 0.7514219880104065, 0.24063999950885773, -0.007220109924674034, 0.0011066800216212869, -0.04208869859576225, 0.9991130232810974, 0.8800010085105896, 0.6202960014343262, 0.9795349836349487, 0.0035952299367636442, -0.01745850034058094, 0.0011066800216212869, -0.04208869859576225, 0.9991130232810974, 0.9998999834060669, 0.5017970204353333, 0.7514219880104065, 0.24063999950885773, -0.007220109924674034, 0.05228950083255768, 0.00718748988583684, 0.9986060261726379, 0.8800010085105896, 0.6202960014343262, 0.5319920182228088, 0.0021256599575281143, 0.005986509844660759, 0.05228950083255768, 0.00718748988583684, 0.9986060261726379, 0.7659429907798767, 0.5010629892349243, 0.9795349836349487, 0.0035952299367636442, -0.01745850034058094, 0.05228950083255768, 0.00718748988583684, 0.9986060261726379, 0.9998999834060669, 0.5017970204353333, -0.46525898575782776, 0.39380401372909546, 0.025464599952101707, -0.09720789641141891, 0.14235299825668335, 0.985031008720398, 0.2674170136451721, 0.7325829863548279, -0.4572199881076813, 1, -0.06134700030088425, -0.09720789641141891, 0.14235299825668335, 0.985031008720398, 0.27143600583076477, 0.9998999834060669, -0.7218970060348511, 0.7166489958763123, -0.046518001705408096, -0.09720789641141891, 0.14235299825668335, 0.985031008720398, 0.13242000341415405, 0.867579996585846, -1, 0.46531298756599426, 0.0051511600613594055, 0.1758659929037094, 0.00777221005409956, 0.9843829870223999, 0.00009999590110965073, 0.7326099872589111, -0.7218970060348511, 0.7166489958763123, -0.046518001705408096, 0.1758659929037094, 0.00777221005409956, 0.9843829870223999, 0.13242000341415405, 0.867579996585846, -1, 1, 0.0009295340278185904, 0.1758659929037094, 0.00777221005409956, 0.9843829870223999, 0.00009998000314226374, 0.9998999834060669, -0.239996999502182, -0.7611619830131531, -0.042178500443696976, -0.0028323601000010967, -0.16639700531959534, 0.9860550165176392, 0.3774360120296478, 0.12266100198030472, -0.005819350015372038, -0.515201985836029, 6.141689823380148e-8, -0.0028323601000010967, -0.16639700531959534, 0.9860550165176392, 0.49709099531173706, 0.2424509972333908, -0.48376700282096863, -0.507066011428833, 6.044700029406158e-8, -0.0028323601000010967, -0.16639700531959534, 0.9860550165176392, 0.2528209984302521, 0.2530499994754791, -0.7353860139846802, 0.2528130114078522, 0.041692301630973816, -0.263480007648468, -0.16464799642562866, 0.9505100250244141, 0.13237999379634857, 0.6139479875564575, -1, 0.46531298756599426, 0.0051511600613594055, -0.263480007648468, -0.16464799642562866, 0.9505100250244141, 0.00009999590110965073, 0.7326099872589111, -1, -0.004533649887889624, -0.07623569667339325, -0.263480007648468, -0.16464799642562866, 0.9505100250244141, 0.00010001000191550702, 0.497734010219574, 0.5102729797363281, -1, 0.00046364200534299016, 0.04702800139784813, 0.03133390098810196, 0.9984019994735718, 0.801364004611969, 0.00009998000314226374, 0.763966977596283, -0.763966977596283, -0.018893899396061897, 0.04702800139784813, 0.03133390098810196, 0.9984019994735718, 0.8819069862365723, 0.11809299886226654, 0.50416499376297, -0.50416499376297, -0.014809999614953995, 0.04702800139784813, 0.03133390098810196, 0.9984019994735718, 0.7520319819450378, 0.24796800315380096, 0.50416499376297, -0.50416499376297, -0.014809999614953995, 0.02055959962308407, 0.03103579953312874, 0.9993069767951965, 0.7520319819450378, 0.24796800315380096, 0.25777098536491394, -0.7413769960403442, -0.0023735600989311934, 0.02055959962308407, 0.03103579953312874, 0.9993069767951965, 0.6288599967956543, 0.12938599288463593, 0.5102729797363281, -1, 0.00046364200534299016, 0.02055959962308407, 0.03103579953312874, 0.9993069767951965, 0.801364004611969, 0.00009998000314226374, 0.5102729797363281, -1, 0.00046364200534299016, -0.0008894000202417374, 0.01010149996727705, 0.9999489784240723, 0.801364004611969, 0.00009998000314226374, 0.25777098536491394, -0.7413769960403442, -0.0023735600989311934, -0.0008894000202417374, 0.01010149996727705, 0.9999489784240723, 0.6288599967956543, 0.12938599288463593, -0.010863900184631348, -1, 1.1920899822825959e-7, -0.0008894000202417374, 0.01010149996727705, 0.9999489784240723, 0.49456900358200073, 0.00009998000314226374, -0.005819350015372038, -0.515201985836029, 6.141689823380148e-8, 0.028528299182653427, 0.022760000079870224, 0.9993339776992798, 0.49709099531173706, 0.2424509972333908, 0.25777098536491394, -0.7413769960403442, -0.0023735600989311934, 0.028528299182653427, 0.022760000079870224, 0.9993339776992798, 0.6288599967956543, 0.12938599288463593, 0.50416499376297, -0.50416499376297, -0.014809999614953995, 0.028528299182653427, 0.022760000079870224, 0.9993339776992798, 0.7520319819450378, 0.24796800315380096, 0.2520720064640045, -0.2799060046672821, 0.003274759976193309, -0.012818800285458565, 0.00013350399967748672, 0.9999179840087891, 0.6399250030517578, 0.3600749969482422, -0.0004537109925877303, 0.0004537109925877303, -5.408649916827102e-11, -0.012818800285458565, 0.00013350399967748672, 0.9999179840087891, 0.4997729957103729, 0.5002269744873047, -0.005819350015372038, -0.515201985836029, 6.141689823380148e-8, -0.012818800285458565, 0.00013350399967748672, 0.9999179840087891, 0.49709099531173706, 0.2424509972333908, -0.239996999502182, -0.7611619830131531, -0.042178500443696976, 0.08647509664297104, 0.25312501192092896, 0.9635609984397888, 0.3774360120296478, 0.12266100198030472, -0.4982599914073944, -1, 0.04374169930815697, 0.08647509664297104, 0.25312501192092896, 0.9635609984397888, 0.25091999769210815, 0.00009998000314226374, -0.010863900184631348, -1, 1.1920899822825959e-7, 0.08647509664297104, 0.25312501192092896, 0.9635609984397888, 0.49456900358200073, 0.00009998000314226374, -0.7218970060348511, 0.7166489958763123, -0.046518001705408096, -0.0390515998005867, 0.18778100609779358, 0.9814339876174927, 0.13242000341415405, 0.867579996585846, -0.7353860139846802, 0.2528130114078522, 0.041692301630973816, -0.0390515998005867, 0.18778100609779358, 0.9814339876174927, 0.13237999379634857, 0.6139479875564575, -0.46525898575782776, 0.39380401372909546, 0.025464599952101707, -0.0390515998005867, 0.18778100609779358, 0.9814339876174927, 0.2674170136451721, 0.7325829863548279, 0.7580779790878296, 0.737500011920929, 0.015358000062406063, 0.0590411014854908, -0.031601499766111374, 0.9977549910545349, 0.8685569763183594, 0.8686760067939758, 0.2689729928970337, 0.7334740161895752, 0.04417270049452782, 0.0590411014854908, -0.031601499766111374, 0.9977549910545349, 0.6344599723815918, 0.8666639924049377, 0.5204560160636902, 0.4913730025291443, 0.021623600274324417, 0.0590411014854908, -0.031601499766111374, 0.9977549910545349, 0.7492709755897522, 0.7494990229606628, 0.7580779790878296, 0.737500011920929, 0.015358000062406063, 0.0040739900432527065, -0.045448899269104004, 0.9989579916000366, 0.8685569763183594, 0.8686760067939758, 0.7514219880104065, 0.24063999950885773, -0.007220109924674034, 0.0040739900432527065, -0.045448899269104004, 0.9989579916000366, 0.8800010085105896, 0.6202960014343262, 1, 0.45974001288414, 0.0017343700164929032, 0.0040739900432527065, -0.045448899269104004, 0.9989579916000366, 0.9998999834060669, 0.7298240065574646, 0.50416499376297, -0.50416499376297, -0.014809999614953995, 0.00876494962722063, -0.033878400921821594, 0.9993879795074463, 0.7520319819450378, 0.24796800315380096, 1, -0.5159580111503601, -0.01955839991569519, 0.00876494962722063, -0.033878400921821594, 0.9993879795074463, 0.9998999834060669, 0.24207299947738647, 0.7471569776535034, -0.2553279995918274, -0.00850577000528574, 0.00876494962722063, -0.033878400921821594, 0.9993879795074463, 0.8735039830207825, 0.3723610043525696, -0.7353860139846802, 0.2528130114078522, 0.041692301630973816, 0.03011309914290905, 0.057162899523973465, 0.9979109764099121, 0.13237999379634857, 0.6139479875564575, -0.5015019774436951, -0.0020463198889046907, 0.04923360049724579, 0.03011309914290905, 0.057162899523973465, 0.9979109764099121, 0.24929900467395782, 0.49897700548171997, -0.46525898575782776, 0.39380401372909546, 0.025464599952101707, 0.03011309914290905, 0.057162899523973465, 0.9979109764099121, 0.2674170136451721, 0.7325829863548279, -0.7218970060348511, 0.7166489958763123, -0.046518001705408096, 0.11382000148296356, -0.054402101784944534, 0.9920110106468201, 0.13242000341415405, 0.867579996585846, -0.4572199881076813, 1, -0.06134700030088425, 0.11382000148296356, -0.054402101784944534, 0.9920110106468201, 0.27143600583076477, 0.9998999834060669, -1, 1, 0.0009295340278185904, 0.11382000148296356, -0.054402101784944534, 0.9920110106468201, 0.00009998000314226374, 0.9998999834060669]),
      new Uint16Array([])
  );

  // 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167

  this.load = function() {
      var r = new XMLHttpRequest();

      var path = (Site.isMobile) ?
          "/bin/mobile/combined.blob":
          "/bin/desktop/combined.blob";

      r.open("GET", path, true);
      r.responseType = "arraybuffer";

      r.onload = function(e) {
          var data = r.response;
          if (data) self.processModels(data);
      };

      r.send(null);
  }

  this.processModels = function(data){
      var modelCount = new Uint32Array(data, 0, 1)[0];
      var modelSizes = new Uint32Array(data, Uint32Array.BYTES_PER_ELEMENT, modelCount);
      var modelOffset = (modelSizes.length + 1) * Uint32Array.BYTES_PER_ELEMENT;

      var models = [];
      for (var i=0; i<modelCount; i++) {
          var counts = new Uint32Array(data, modelOffset, 2);

          var vertexCount = counts[0];
          var indexCount = counts[1];
          var vertexOffset = Uint32Array.BYTES_PER_ELEMENT * 2;
          var indexOffset = vertexOffset + (Float32Array.BYTES_PER_ELEMENT * vertexCount);

          var vertices = new Float32Array(data, vertexOffset + modelOffset, vertexCount);
          var indices = new Uint16Array(data, indexOffset + modelOffset, indexCount);
          models.push(new GK.Model(vertices, indices));
          modelOffset += modelSizes[i];
      }

      self.models.nebula = models[0];
      self.models.globe = models[1];
      self.models.ring = models[2];

      self.loadSignal.fire();
  }
}

/*////////////////////////////////////
CanvasManager
////////////////////////////////////*/

Site.CanvasManager = function() {
  var self = this;

  this.nebula;
  this.globe;
  this.bokeh;
  this.quakes;
  this.bigQuake;
  this.canvas;
  this.camera;
  this.background;
  this.globeForward;
  this.earthquakes;

  // Popup
  this.selectedQuake;
  this.infoAnim;
  this.infoTimeout;

  var sinTime;
  var slowTime;

  this.init = function() {
      this.canvas = document.getElementById("terra-canvas");
      this.camera = new GK.Camera(220, this.canvas.width / this.canvas.height, 0.1, 1000.0);

      window.gl = this.canvas.getContext("experimental-webgl", {antialias: false, alpha: false});
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.clearColor(0.30, 0.50, 0.9, 1.0);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      //gl.enable(gl.CULL_FACE);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);

      this.globe = new GK.PointGlobeDrawable().init();
      this.nebula = new GK.NebulaDrawable().init();
      this.bokeh = new GK.BokehDrawable().init();
      this.ring = new GK.RingDrawable().init();
      this.background = new GK.BackgroundDrawable().init();
      this.quakes = new GK.EarthquakeDrawable().init();
      this.bigQuake = new GK.BigQuakeDrawable().init();

      this.requestAnimFrame(this.tick);
  }

  this.draw = function(timestamp) {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      slowTime = timestamp * 0.0002;
      sinTime = Math.sin(slowTime);

      var m = self.globe.modelMatrix;
      mat4.identity(m);
      mat4.translate(m, m, [8.0, 0.0, -500.0]);
      mat4.scale(m, m, [18.0, 18.0, 18.0]);
      mat4.rotateX(m, m, sinTime);
      mat4.rotateY(m, m, slowTime);

      var origin = vec3.fromValues(0.0, 0.0, 0.0);
      var forward = vec3.fromValues(-0.8, 0.0, 1.0);
      vec3.rotateX(forward, forward, origin, -sinTime);
      vec3.rotateY(forward, forward, origin, -slowTime);
      vec3.normalize(forward, forward);
      self.globeForward = forward;

      m = self.ring.modelMatrix;
      mat4.identity(m);
      mat4.translate(m, m, [8.5, 0.0, -500.0]);
      mat4.scale(m, m, [22.0, 22.0, 22.0]);
      mat4.rotateY(m, m, Math.PI / 9.0);
      mat4.rotateX(m, m, -Math.PI / 9.0);

      m = self.background.modelMatrix;
      mat4.identity(m);
      mat4.translate(m, m, [0.0, 0.0, -22.0]);
      var bgRatio = Math.max(this.camera.vRatio, 1.0);
      mat4.scale(m, m, [bgRatio, bgRatio, 1.0]);

      m = self.nebula.modelMatrix;
      mat4.identity(m);
      mat4.translate(m, m, [1.8, 0.0, -100.0]);
      mat4.scale(m, m, [7.0, 7.0, 7.0]);
      mat4.rotateX(m, m, sinTime);
      mat4.rotateY(m, m, slowTime);

      m = self.bokeh.modelMatrix;
      mat4.identity(m);
      mat4.translate(m, m, [1.5, -0.0, -90.0]);;
      mat4.rotateX(m, m, sinTime);
      mat4.rotateY(m, m, slowTime);

      self.quakes.modelMatrix = mat4.clone(self.globe.modelMatrix);
      self.bigQuake.modelMatrix = mat4.clone(self.globe.modelMatrix);

      gl.depthMask(false);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      self.background.draw(self.camera, timestamp);
      self.nebula.draw(self.camera, timestamp);

      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      self.ring.draw(self.camera, timestamp);
      self.globe.draw(self.camera, timestamp);
      self.bokeh.draw(self.camera, timestamp);
      self.quakes.draw(self.camera, timestamp);

      if (Site.ww > 703) {
          self.bigQuake.draw(self.camera, timestamp);
          self.updateSelectedQuake();
      }
  }

  this.updateSelectedQuake = function() {
      if (!this.selectedQuake) {
          return;
      }

      var m = mat4.create();
      mat4.multiply(m, self.camera.perspectiveMatrix, self.globe.modelMatrix);

      var p = vec3.clone(self.selectedQuake.pos);
      var viewport = [0.0, self.canvas.height, self.canvas.width, -self.canvas.height];
      var screenPos = GK.ProjectionUtil.project(p, m, viewport);
  }

  this.updateViewport = function() {
      gl.viewport(0, 0, self.canvas.width, self.canvas.height);
      self.camera.vRatio = self.canvas.width / self.canvas.height;
      self.camera.update();
  }

  this.tick = function(timestamp) {
      self.requestAnimFrame(self.tick);
      self.draw(timestamp);
  }

  this.pulse = function(width, height, variety, duration, waveVector) {
      var w = width || 0.1;
      var h = height || 0.04;
      var v = variety || 0.0;
      var d = duration || 4.0;

      self.globe.ringWidth = w;
      self.globe.ringHeight = h;
      self.globe.ringVariety = v;
      self.globe.ringProgress = 0.0;
      self.globe.ringEffectStr = 0.0;

      // Wave emanates from front to back
      if (!waveVector) {
          waveVector = self.globeForward;
      }

      self.globe.waveVector = waveVector;

      // Create animation
      var a = new Animation(d);
      a.updateFn = function(value) {
          var v = BK.Ease.outSine(value);
          self.globe.ringProgress = 2.0 * v;
          self.globe.ringEffectStr = BK.Ease.smoothstep(0.0, 0.1, value) - BK.Ease.smoothstep(0.8, 1.0, value);
      }
      a.start();
  }

  this.quakesDidLoad = function(earthquakes) {
      this.earthquakes = earthquakes;
      Site.canvasManager.quakes.createGeometry(earthquakes);
      Site.canvasManager.bigQuake.createGeometry(earthquakes[0]);
  }

  this.quakePulse = function() {
      var quake = self.getPertinentQuake();
      var dir = vec3.clone(quake.pos);
      vec3.normalize(dir, dir);

      self.bigQuake.createGeometry(quake);
      self.selectedQuake = quake;

      // Create animation
      self.globe.waveEffectStr = 0.0;
      self.globe.waveVector = dir;
      self.globe.waveWidth = 0.1;
      self.globe.waveHeight = 0.005;

      var startPS = Site.ps * 20.0;
      var endPS = Site.ps * 10.0;
      var deltaPS = endPS - startPS;

      self.bigQuake.pointSize = startPS;
      self.bigQuake.progress = 0.0;
      self.bigQuake.alpha = 0.0;

      if(self.infoAnim) {
          self.infoAnim.stop();
      }

      self.infoAnim = new Animation(5.0);
      self.infoAnim.updateFn = function(value) {
          var progress = BK.Ease.outSine(BK.Ease.smoothstep(0.0, 0.2, value));
          self.bigQuake.progress = progress;
          self.bigQuake.pointSize = startPS + (deltaPS * progress);
          self.bigQuake.alpha = BK.Ease.smoothstep(0.0, 0.1, value) - BK.Ease.smoothstep(0.7, 0.8, value);
          self.globe.waveEffectStr = BK.Ease.smoothstep(0.0, 0.5, value) - BK.Ease.smoothstep(0.5, 1.0, value);
      }
      self.infoAnim.start();

      self.infoTimeout = setTimeout(function(){
          self.pulse(0.1, 0.04, 0.0, 3.0, dir);
      }, 600);
  }

  this.dismissInfo = function() {
      if (self.infoAnim) {
          self.infoAnim.stop();
      }

      clearTimeout(self.infoTimeout);
  }

  this.getPertinentQuake = function() {
      var distances = [];
      var forward = this.globeForward;

      for (var i=0; i<this.earthquakes.length; i++) {
          var quake = this.earthquakes[i];
          var cosTheta = vec3.dot(this.earthquakes[i].pos, forward);
          distances.push({quake: quake, theta: cosTheta});
      }

      distances.sort(function(a, b) {
          return b.theta - a.theta;
      });

      return distances[0].quake;
  }

  this.earthquake = function() {
      var a = new Animation(4.0);
      a.updateFn = function(value) {
          var v = BK.Ease.inOutSine(value);
          self.globe.ringProgress = 2.0 * BK.Ease.inOutSine(GKEase.smoothstep(0.2, 1.0, value));
          self.globe.ringEffectStr = 1.0 - BK.Ease.smoothstep(0.2, 0.6, value);
          self.globe.waveEffectStr = BK.Ease.smoothstep(0.0, 0.1, value) - BK.Ease.smoothstep(0.5, 1.0, value);
      }
      a.start();
  }

  this.geometryLoaded = function() {
      self.ring.loadGeometry(this.geomLoader.models.ring);
      self.nebula.loadGeometry(this.geomLoader.models.nebula);
      self.globe.loadGeometry(this.geomLoader.models.globe);
  }

  this.requestAnimFrame = (window.requestAnimationFrame || window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame || window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame).bind(window);
}

/*////////////////////////////////////
gl-matrix
////////////////////////////////////*/

/*////////////////////////////////////
Camera
////////////////////////////////////*/

GK.Camera = function(vFov, vRatio, zNear, zFar) {
  this.vFov = vFov;
  this.vRatio = vRatio;
  this.zNear = zNear;
  this.zFar = zFar;

  this.perspectiveMatrix = mat4.create();
  mat4.perspective(this.perspectiveMatrix, vFov, vRatio, zNear, zFar);

  this.update = function() {
      mat4.perspective(this.perspectiveMatrix, this.vFov, this.vRatio, this.zNear, this.zFar);
  }
}

/*////////////////////////////////////
Program
////////////////////////////////////*/

GK.Program = function(){
  var self = this;

  this.name;
  this.program;
  this.vertexShader;
  this.fragmentShader;

  this.uniforms = {};
  this.attributes = {};

  this.init = function(vertexShaderStr, fragmentShaderStr){
      this.fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
      this.compileShader(this.fragmentShader, fragmentShaderStr);

      this.vertexShader = gl.createShader(gl.VERTEX_SHADER);
      this.compileShader(this.vertexShader, vertexShaderStr);

      this.program = gl.createProgram();
      gl.attachShader(this.program, this.vertexShader);
      gl.attachShader(this.program, this.fragmentShader);
      gl.linkProgram(this.program);

      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
          console.log("Could not initialise shaders", this);
      }

      this.name = this.program;
      this.assignAttributesAndUniforms();
      return this;
  }

  this.assignAttributesAndUniforms = function(){
      var info = this.getInfo();

      for (var i=0; i<info.attributes.length; i++){
          var attribute = info.attributes[i];
          this.attributes[attribute.name] = gl.getAttribLocation(this.name, attribute.name);
      }

      for (var j=0; j<info.uniforms.length; j++){
          var uniform = info.uniforms[j];
          this.uniforms[uniform.name] = gl.getUniformLocation(this.name, uniform.name);
      }
  }

  this.compileShader = function(shader, str){
      gl.shaderSource(shader, str);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          console.log(gl.getShaderInfoLog(shader));
          return null;
      }

      return shader;
  }

  this.getInfo = function() {
      var result = {
          attributes: [],
          uniforms: [],
          attributeCount: 0,
          uniformCount: 0
      };

      var activeUniforms = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
      var activeAttributes = gl.getProgramParameter(this.program, gl.ACTIVE_ATTRIBUTES);

      // Taken from the WebGl spec:
      // http://www.khronos.org/registry/webgl/specs/latest/1.0/#5.14
      var enums = {
          0x8B50: 'FLOAT_VEC2',
          0x8B51: 'FLOAT_VEC3',
          0x8B52: 'FLOAT_VEC4',
          0x8B53: 'INT_VEC2',
          0x8B54: 'INT_VEC3',
          0x8B55: 'INT_VEC4',
          0x8B56: 'BOOL',
          0x8B57: 'BOOL_VEC2',
          0x8B58: 'BOOL_VEC3',
          0x8B59: 'BOOL_VEC4',
          0x8B5A: 'FLOAT_MAT2',
          0x8B5B: 'FLOAT_MAT3',
          0x8B5C: 'FLOAT_MAT4',
          0x8B5E: 'SAMPLER_2D',
          0x8B60: 'SAMPLER_CUBE',
          0x1400: 'BYTE',
          0x1401: 'UNSIGNED_BYTE',
          0x1402: 'SHORT',
          0x1403: 'UNSIGNED_SHORT',
          0x1404: 'INT',
          0x1405: 'UNSIGNED_INT',
          0x1406: 'FLOAT'
      };

      // Loop through active uniforms
      for (var i=0; i < activeUniforms; i++) {
          var uniform = gl.getActiveUniform(this.program, i);
          uniform.typeName = enums[uniform.type];
          result.uniforms.push(uniform);
          result.uniformCount += uniform.size;
      }

      // Loop through active attributes
      for (var i=0; i < activeAttributes; i++) {
          var attribute = gl.getActiveAttrib(this.program, i);
          attribute.typeName = enums[attribute.type];
          result.attributes.push(attribute);
          result.attributeCount += attribute.size;
      }

      return result;
  }
}

/*////////////////////////////////////
ProgramManager
////////////////////////////////////*/

GK.ProgramManager = {
  programs: {},

  create: function(vertexStr, fragmentStr) {
      var key = vertexStr + fragmentStr;
      if (key in GK.ProgramManager.programs) {
          return GK.ProgramManager.programs[key]
      }

      var p = new GK.Program().init(vertexStr, fragmentStr);
      GK.ProgramManager.programs[key] = p
      return p
  }
}

/*////////////////////////////////////
TextureManager
////////////////////////////////////*/

GK.TextureManager = {
  loadTexture: function(path, premultiply, wrapS, wrapT) {
      var t = gl.createTexture();
      t.image = new Image();
      t.image.onload = function () {
          GK.TextureManager.configureTexture(t, premultiply, wrapS, wrapT)
          t.loaded = true;
      }

      t.image.src = path;
      return t;
  },

  configureTexture: function(t, premultiply, wrapS, wrapT) {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiply);

      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, t.image);

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

      gl.bindTexture(gl.TEXTURE_2D, null);
  }
}

/*////////////////////////////////////
PointGlobeDrawable
////////////////////////////////////*/

GK.PointGlobeDrawable = function(){
  var vertex = `
      precision lowp float;

      attribute vec3 aPosition;
      attribute vec2 aTexture;
      attribute float aStrength;
      attribute float aOffset;

      uniform mat4 uMVMatrix;
      uniform mat4 uPMatrix;

      uniform float uOffsetPower;
      uniform float uPointSize;
      uniform float uTime;

      varying vec2 vTexture;
      varying float vAlpha;
      varying float vTime;

      uniform vec3 uWaveVector;
      uniform float uWaveHeight;
      uniform float uWaveWidth;
      uniform float uWaveVariety;
      uniform float uWaveEffectStr;
      uniform float uWaveTime;
      varying float vWavePower;
      varying float vWaveAmp;

      uniform float uRingProgress;
      uniform float uRingHeight;
      uniform float uRingWidth;
      uniform float uRingVariety;
      uniform float uRingEffectStr;
      varying float vRingPower;

      #define M_PI 3.1415926535897932384626433832795

      void main(void) {
          // Scatter effect
          vec3 pos = aPosition + ((aPosition * aOffset) * uOffsetPower);

          // Earthquake effect
          float waveCos = dot(uWaveVector, pos);
          vWavePower = smoothstep(1.0 - uWaveWidth, 1.1, max(waveCos, 0.0));
          float waveAngle = vWavePower * (-M_PI * 4.0);
          vWaveAmp = sin(waveAngle + uWaveTime) * vWavePower;
          pos += pos * vWaveAmp * uWaveHeight * uWaveEffectStr;
          pos += pos * aOffset * uWaveVariety * vWavePower * uWaveEffectStr;

          // Ring effect
          vRingPower = smoothstep(uRingProgress, uRingProgress + uRingWidth, waveCos);
          vRingPower -= smoothstep(uRingProgress + uRingWidth, uRingProgress + uRingWidth * 2.0, waveCos);
          pos += pos * vRingPower * uRingHeight * uRingEffectStr;
          pos += pos * aOffset * uRingVariety * vRingPower * uRingEffectStr;

          // Adjust point size
          float pointSize = uPointSize + (uPointSize * vWaveAmp * uWaveEffectStr) + (uPointSize * pow(vRingPower, 6.0) * uRingEffectStr);
          gl_PointSize = max(pointSize - (pow(pointSize * aOffset, 2.0) * uOffsetPower * 0.25), 1.0);
          //gl_PointSize = pointSize;

          // Project position
          vec4 mvPosition = uMVMatrix * vec4(pos, 1.0);
          gl_Position = uPMatrix * mvPosition;

          // Fade out at back of sphere
          vec3 transformedNormal = normalize(mat3(uMVMatrix) * aPosition);
          vec3 lightDirection = normalize(vec3(0.0, 0.0, 1.0) - mvPosition.xyz);
          float lightWeight = max(dot(transformedNormal, lightDirection), 0.0);
          vAlpha = max(aStrength * lightWeight, 0.1);

          // Apply lighting to effects
          vRingPower *= lightWeight * uRingEffectStr;
          vWavePower *= lightWeight * uRingEffectStr;

          // Pass along
          vTexture = aTexture;
          vTime = uTime;
      }
  `;

  var fragment = `
      precision lowp float;

      varying vec2 vTexture;
      varying float vAlpha;
      varying float vTime;

      varying float vWavePower;
      varying float vWaveAmp;
      varying float vRingPower;

      uniform float uAlpha;
      uniform sampler2D uSampler;
      uniform sampler2D uNoiseSampler;

      void main(void) {
          vec4 textureColor = texture2D(uSampler, gl_PointCoord);
          vec4 noiseColor = texture2D(uNoiseSampler, vec2(vTexture.x + vTime, vTexture.y));
          float noiseAlpha = pow(noiseColor.r, 3.0);
          gl_FragColor = vec4(textureColor.rgb, (textureColor.a * vAlpha * noiseAlpha + vWavePower + vRingPower) * uAlpha);
      }
  `;

  var self = this;

  // WebGL
  var vertices;
  var arrayBuffer;
  var texture;
  var noiseTexture;

  // Geometry
  var geometryLoaded = false;
  this.modelMatrix = mat4.create();
  mat4.identity(this.modelMatrix);

  // Effects
  this.alpha = 1.0;
  this.offsetPower = 0.0;
  this.pointSize = 2.0;
  this.shaderSpeed = 0.00001;

  this.ringHeight = 0.04;
  this.ringWidth = 0.04;
  this.ringProgress = 0.0;
  this.ringEffectStr = 1.0;
  this.ringVariety = 0.0;

  this.waveHeight = 0.04;
  this.waveWidth = 0.1;
  this.waveVariety = 0.0;
  this.waveEffectStr = 1.0;

  this.waveVector = vec3.fromValues(0.0, 1.0, 1.0);
  vec3.normalize(this.waveVector, this.waveVector);

  this.init = function() {
      this.program = GK.ProgramManager.create(vertex, fragment);
      texture = GK.TextureManager.loadTexture("/img/texture/dot.png", true, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
      noiseTexture = GK.TextureManager.loadTexture("/img/texture/clouds.png", true, gl.REPEAT, gl.REPEAT);
      return this;
  }

  this.loadGeometry = function(model) {
      vertices = model.vertices

      arrayBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, arrayBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      geometryLoaded = true;
  }

  this.draw = function(camera, time) {
      if (!(texture.loaded && noiseTexture.loaded)) return;
      if (!geometryLoaded) return;

      // Activate program
      gl.useProgram(this.program.name);

      // Uniforms
      gl.uniformMatrix4fv(this.program.uniforms.uPMatrix, false, camera.perspectiveMatrix);
      gl.uniformMatrix4fv(this.program.uniforms.uMVMatrix, false, this.modelMatrix);
      gl.uniform1f(this.program.uniforms.uOffsetPower, this.offsetPower);
      gl.uniform1f(this.program.uniforms.uPointSize, this.pointSize);
      gl.uniform1f(this.program.uniforms.uTime, time * this.shaderSpeed);
      gl.uniform1f(this.program.uniforms.uAlpha, this.alpha);

      // Wave
      gl.uniform1f(this.program.uniforms.uWaveVariety, this.waveVariety);
      gl.uniform1f(this.program.uniforms.uWaveHeight, this.waveHeight);
      gl.uniform1f(this.program.uniforms.uWaveWidth, this.waveWidth);
      gl.uniform1f(this.program.uniforms.uWaveEffectStr, this.waveEffectStr);
      gl.uniform1f(this.program.uniforms.uWaveTime, time * 0.01);
      gl.uniform3fv(this.program.uniforms.uWaveVector, this.waveVector);

      // Ring
      gl.uniform1f(this.program.uniforms.uRingWidth, this.ringWidth);
      gl.uniform1f(this.program.uniforms.uRingHeight, this.ringHeight);
      gl.uniform1f(this.program.uniforms.uRingProgress, 1.0 - this.ringProgress);
      gl.uniform1f(this.program.uniforms.uRingEffectStr, this.ringEffectStr);
      gl.uniform1f(this.program.uniforms.uRingVariety, this.ringVariety);

      // Textures
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(this.program.uniforms.uSampler, 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, noiseTexture);
      gl.uniform1i(this.program.uniforms.uNoiseSampler, 1);

      // Array data
      gl.bindBuffer(gl.ARRAY_BUFFER, arrayBuffer);

      gl.vertexAttribPointer(this.program.attributes.aPosition, 3, gl.FLOAT, false, 28, 0);
      gl.vertexAttribPointer(this.program.attributes.aTexture, 2, gl.FLOAT, false, 28, 12);
      gl.vertexAttribPointer(this.program.attributes.aStrength, 1, gl.FLOAT, false, 28, 20);
      gl.vertexAttribPointer(this.program.attributes.aOffset, 1, gl.FLOAT, false, 28, 24);

      gl.enableVertexAttribArray(this.program.attributes.aPosition);
      gl.enableVertexAttribArray(this.program.attributes.aTexture);
      gl.enableVertexAttribArray(this.program.attributes.aStrength);
      gl.enableVertexAttribArray(this.program.attributes.aOffset);

      // Draw
      gl.drawArrays(gl.POINTS, 0, vertices.length / 7);
  }
}

/*////////////////////////////////////
NebulaDrawable
////////////////////////////////////*/

GK.NebulaDrawable = function(){
  var vertex = `
      precision highp float;

      attribute vec3 aPosition;
      attribute vec3 aNormal;
      attribute vec2 aTexture;

      uniform mat4 uMVMatrix;
      uniform mat4 uPMatrix;
      uniform float uTime;

      varying vec2 vTexture;
      varying float vAlpha;
      varying float vTime;

      void main(void) {
          vec4 mvPosition = uMVMatrix * vec4(aPosition, 1.0);
          gl_Position = uPMatrix * mvPosition;

          vec3 transformedNormal = normalize(mat3(uMVMatrix) * aNormal);
          vec3 camDir = normalize(vec3(0.0, 0.0, 1.0) - mvPosition.xyz);
          vAlpha = pow(abs(dot(transformedNormal, camDir)), 6.0);

          vTexture = aTexture;
          vTime = uTime;
      }
  `;

  var fragment = `
      precision highp float;

      varying vec2 vTexture;
      varying float vAlpha;
      varying float vTime;

      uniform float uAlpha;
      uniform sampler2D uSampler;

      vec2 rotTex(vec2 coord, float angle) {
          float s = sin(angle);
          float c = cos(angle);

          mat2 rot = mat2(c, s, -s, c);
          rot *= 0.5;
          rot += 0.5;
          rot = rot * 2.0 - 1.0;

          coord = coord - 0.5;
          coord = coord * rot;
          coord += 0.5;
          return coord;
      }

      void main(void) {
          vec2 coord = rotTex(vTexture, vTime);
          vec4 color = texture2D(uSampler, coord);
          gl_FragColor = vec4(color.rgb, color.a * vAlpha * uAlpha);
      }
  `;

  var self = this;

  // WebGL
  var vertexBuffer;
  var indexBuffer;
  var indexCount;
  var vertexCount;
  var texture;

  // Geometry
  var geometryLoaded = false;
  this.modelMatrix = mat4.create();
  mat4.identity(this.modelMatrix);

  // Effects
  this.shaderTime = 0.0001;
  this.alpha = 1.0;

  this.init = function() {
      this.program = GK.ProgramManager.create(vertex, fragment);
      texture = GK.TextureManager.loadTexture("/img/texture/nebula.png", false, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
      return this;
  }

  this.loadGeometry = function(model) {
      var vertices = model.vertices;
      var indices = model.indices;

      vertexCount = vertices.length;
      indexCount = indices.length;

      vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

      geometryLoaded = true;
  }

  this.draw = function(camera, time){
      if (!texture.loaded) return;
      if (!geometryLoaded) return;

      gl.useProgram(this.program.name);

      gl.uniformMatrix4fv(this.program.uniforms.uPMatrix, false, camera.perspectiveMatrix);
      gl.uniformMatrix4fv(this.program.uniforms.uMVMatrix, false, this.modelMatrix);
      gl.uniform1f(this.program.uniforms.uTime, time * this.shaderTime);
      gl.uniform1f(this.program.uniforms.uAlpha, this.alpha);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(this.program.uniforms.uSampler, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

      gl.vertexAttribPointer(this.program.attributes.aPosition, 3, gl.FLOAT, false, 32, 0);
      gl.vertexAttribPointer(this.program.attributes.aNormal, 3, gl.FLOAT, false, 32, 12);
      gl.vertexAttribPointer(this.program.attributes.aTexture, 2, gl.FLOAT, false, 32, 24);

      gl.enableVertexAttribArray(this.program.attributes.aPosition);
      gl.enableVertexAttribArray(this.program.attributes.aNormal);
      gl.enableVertexAttribArray(this.program.attributes.aTexture);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
  }
}

/*////////////////////////////////////
BokehDrawable
////////////////////////////////////*/

GK.BokehDrawable = function(){
  var vertex = `
      attribute vec3 aPosition;
      attribute vec3 aDirection;
      attribute float aVariance;

      uniform mat4 uMVMatrix;
      uniform mat4 uPMatrix;

      uniform float uAlphaSpeed;
      uniform float uAlphaRange;
      uniform float uAlphaMul;
      uniform float uPointSize;

      uniform float uTime;
      varying float vAlpha;

      #define M_PI 3.1415926535897932384626433832795

      void main(void) {
          float variedTime = uTime + (aVariance * 10.0);
          float slowTime = variedTime * 0.1;
          float dist = sin(mod(slowTime, M_PI / 2.0));

          vAlpha = abs(sin(slowTime * 2.0));
          vAlpha *= min(abs(tan(variedTime) * uAlphaSpeed * aVariance), uAlphaRange);
          vAlpha *= uAlphaMul;

          vec3 pos = aPosition;
          pos += aDirection * dist * 2.0;

          gl_PointSize = aVariance * uPointSize;
          gl_Position = uPMatrix * uMVMatrix * vec4(pos, 1.0);
      }
  `;

  var fragment = `
      precision mediump float;

      varying float vAlpha;
      uniform float uAlpha;
      uniform sampler2D uSampler;

      void main(void) {
          vec4 color = texture2D(uSampler, gl_PointCoord);
          gl_FragColor = vec4(color.rgb, color.a * vAlpha * uAlpha);
      }
  `;

  var self = this;

  var texture1;
  var texture2;
  var vertices;
  var vertexCount;
  var arrayBuffer;

  // WebGL
  var geometryLoaded = false;
  this.modelMatrix = mat4.create();
  mat4.identity(this.modelMatrix);

  // Effects
  this.shaderSpeed = 0.00005;     // default is 0.00005
  this.alphaRange = 10.0;         // default is 10
  this.alphaSpeed = 0.1;          // default is 0.1
  this.alphaMul = 0.05;           // default is 0.05
  this.alpha = 1.0;

  // default is 84
  this.pointSize = 84.0;

  this.init = function() {
      this.program = GK.ProgramManager.create(vertex, fragment);
      this.createGeometry();

      texture1 = GK.TextureManager.loadTexture("/img/texture/bokeh1.png", true, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
      texture2 = GK.TextureManager.loadTexture("/img/texture/bokeh2.png", true, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);

      return this;
  }

  this.createGeometry = function() {
      vertexCount = 100;
      vertices = new Float32Array(vertexCount * 7);

      var i = 0;
      while(i < vertices.length) {
          var rando1 = Math.random();
          var rando2 = Math.random();
          var rando3 = Math.random();

          if (rando3 > 0.9) {
              rando3 *= 1.5;
          }
          if (rando3 > 0.95) {
              rando3 *= 1.5;
          }
          if (rando3 > 0.99) {
              rando3 *= 1.5;
          }

          var lat = Math.acos(2.0 * rando1 - 1.0) - (Math.PI * 0.5);
          var lng = Math.PI * 2.0 * rando2;

          var y = Math.sin(lat);
          var x = Math.sin(lng);
          var z = Math.cos(lng);

          var pos = vec3.fromValues(x, y, z);
          var normal = vec3.create();
          vec3.normalize(normal, pos);

          vertices[i+0] = pos[0];
          vertices[i+1] = pos[1];
          vertices[i+2] = pos[2];
          vertices[i+3] = normal[0];
          vertices[i+4] = normal[1];
          vertices[i+5] = normal[2];
          vertices[i+6] = Math.PI * Math.random();

          i += 7;
      }

      arrayBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, arrayBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      geometryLoaded = true;
  }

  this.draw = function(camera, time){
      if (!texture1.loaded && !texture2.loaded) return;
      if (!geometryLoaded) return;

      gl.useProgram(this.program.name);

      gl.uniformMatrix4fv(this.program.uniforms.uPMatrix, false, camera.perspectiveMatrix);
      gl.uniformMatrix4fv(this.program.uniforms.uMVMatrix, false, this.modelMatrix);
      gl.uniform1f(this.program.uniforms.uTime, time * this.shaderSpeed);

      gl.uniform1f(this.program.uniforms.uAlpha, this.alpha);
      gl.uniform1f(this.program.uniforms.uAlphaMul, this.alphaMul);
      gl.uniform1f(this.program.uniforms.uAlphaSpeed, this.alphaSpeed);
      gl.uniform1f(this.program.uniforms.uAlphaRange, this.alphaRange);
      gl.uniform1f(this.program.uniforms.uPointSize, this.pointSize);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture1);
      gl.uniform1i(this.program.uniforms.uSampler, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, arrayBuffer);

      gl.vertexAttribPointer(this.program.attributes.aPosition, 3, gl.FLOAT, false, 28, 0);
      gl.vertexAttribPointer(this.program.attributes.aDirection, 3, gl.FLOAT, false, 28, 12);
      gl.vertexAttribPointer(this.program.attributes.aVariance, 1, gl.FLOAT, false, 28, 24);

      gl.enableVertexAttribArray(this.program.attributes.aPosition);
      gl.enableVertexAttribArray(this.program.attributes.aDirection);
      gl.enableVertexAttribArray(this.program.attributes.aVariance);

      gl.drawArrays(gl.POINTS, 0, vertexCount / 2);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture2);
      gl.uniform1i(this.program.uniforms.uSampler, 0);

      gl.drawArrays(gl.POINTS, vertexCount / 2, vertexCount / 2);
  }
}

/*////////////////////////////////////
BackgroundDrawable
////////////////////////////////////*/

GK.BackgroundDrawable = function(){
  var vertex = `
      precision highp float;

      attribute vec3 aPosition;
      attribute vec3 aNormal;
      attribute vec2 aTexture;

      uniform mat4 uMVMatrix;
      uniform mat4 uPMatrix;
      uniform vec3 uLightDir;

      varying vec2 vTexture;
      varying float vLightWeight;

      void main(void) {
          vec4 mvPosition = uMVMatrix * vec4(aPosition, 1.0);
          gl_Position = uPMatrix * mvPosition;

          vec3 transformedNormal = normalize(mat3(uMVMatrix) * aNormal);
          vec3 lightDirection = normalize(uLightDir - mvPosition.xyz);
          vLightWeight = max(dot(transformedNormal, lightDirection), 0.955);

          vTexture = aTexture;
      }
  `;

  var fragment = `
      precision highp float;

      varying vec2 vTexture;
      varying float vLightWeight;
      uniform sampler2D uSampler;
      uniform float uAlpha;

      void main(void) {
          vec4 textureColor = texture2D(uSampler, vTexture);
          gl_FragColor = vec4(textureColor.rgb * vLightWeight, textureColor.a * uAlpha);
      }
  `;

  var self = this;

  // WebGL
  var texture;
  var vertexBuffer;
  var indexBuffer;
  var vertexCount;
  var indexCount;

  var lightOrigin = vec3.fromValues(0.0, 0.0, 0.0);
  this.lightDir = vec3.fromValues(0.0, 0.0, 1.0);
  this.alpha = 1.0;

  this.modelMatrix = mat4.create();
  mat4.identity(this.modelMatrix);

  var texture = null;

  this.init = function() {
      this.program = GK.ProgramManager.create(vertex, fragment);
      var imgData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAIAAABMXPacAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA4ZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTM4IDc5LjE1OTgyNCwgMjAxNi8wOS8xNC0wMTowOTowMSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo4MjliY2VkNy0zYzU3LTRkZjgtOTg3OS00MWMyM2Y3NTY5ZmEiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MTZFQjJDMjI0N0VDMTFFNzg5RjdFQjc1MDEwOTJFNTMiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MTZFQjJDMjE0N0VDMTFFNzg5RjdFQjc1MDEwOTJFNTMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTcgKE1hY2ludG9zaCkiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo1MWUxN2M2Mi1jZDcwLTQyZjEtOTJiZi0wNzE1M2Q4NDg1NGQiIHN0UmVmOmRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDo2YjRhMDM0Ny05MDU1LTExN2EtYTMxMy1lMGZmN2E3NjJjYjEiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz73icSpAAA0FklEQVR42rR9CZYjR44sEMmr/5P+Y4gODMNhZoAHs9RSzxt1PymLxSXpCxaDweD/z/6//R//c5nF/iEtf8zW57/7n+APiR/0eMwn1PP3c3I/ksknvz//9tx/Tr7q86f9NM/PC6/MhRfe7/T5q/T7X4F3uJ+87keC7xz8xNjv/Hnm+vyVf55W7+D3X30er1fZfsPIevIy/7z2/pT7f/55m9h/e3+V+yH/vNMKr6/zvj8p1+vfraVrlf7FP8E92Kt/LP3jn/f9zP1V9weNZcIP2q33fmQ/OesN0+uJ+zl+L8i1lzLwqqW93m97L8u6f4z9SGStS+14PeFe/ai3XbUfe2MWdjH2m+Dts/5Yv5xHPfN+0t5rbdt+atzfjl/k9R+P7fFP/uHxv92wC3vQx7zvhN/f4Eos4qX78TkuveJYfW3bG2+yV7+Os+OorfuH+8G39ti5g/s/UWf28/L8uoj3IytqaZybXS/y+vnep/20OtH7tXtP93tige//+P6DB16+T8D+zXCr1/2U+01ef3Ns/+Hj/2BLamX7FJu24j6nWP01/mpckfvoBTYhwz8Lh5/X2JXEFpZBwl/hZiRPtNcr703/vMkq04HVyVr0wI7HXuBVBznq7T222blfvj908Qzto10v9f1ZZY72m/A7b+t3n/0Ix/cro/T6Gzvzp5X9jyveT0gdfJ1i/O3XuS73oKVva9OugXc+50N0D3tB88d1bWToy+rgrpSHgB3yWtush3GE98aUqzCsdRmQvbL3csc++3vbHSYw9vNrTVOPWG3oqvNRZ5738XMh7g98/bKa+Tzs17Dj35cg/mz0Lxs2dazatNf1keG0E3SkfMk0RDaeD1enXfwszs/2H6nlgAVoj1LPr8e258Qe5/Ai93n2fVzx8nLvucrKeblUWPna3bKEabw/Rk+LB+s3qVtVBm1l1iWwV/wzL/qPzvtvL1n2XL3kt35jh7aNmGf6/qoKlvIXr7sNUQUndaIXvUIt7s8dpWDHF87yvYJ3UHSfWe531qKvcY0idcHqGR+jUZuGRa/9WO6f3x+mjIZ+ySGVs00v4xaIsvywtdud/JsoKP7N4+PsyxrMrUAAoGvBOE9+736HaW1g0+ss7/VwhIn39/6pgBIhbGbHO7nPx302KyQN3bF6OVa5PGm9fV0+OIDcz5Sxiv0hFZnd7wzLwxgp4/IKTu9H9p5te+UGW1TXsQLZz/79GgX9F3HO9z9LtmK/4SPefyuG4eqflmdGn+fZRxgRDP3uI3x1zBMVP5mMuNtfWTcmbpMCf733rzyw163JdsXldSvirDepJeXn1kvuHdq3B//et0qB7D77ML2RdfZX4uPuvflctR2G/eaE419tQ/5+/Pev3nvwOPvXNuI/eR+NlY8sLMe+1kW5N2wdXoFv69wwT0WE27Dwb+9zGvULLF2MHapmnV/6xiPm0V7SiO8Pin0d1v6MVdEtLMz+2zvSc5qX3D7WePa3FYIJwkbWjf/3Yeh/SnphSe7v7hU62IzltcRZJ6T968y2Kpa+z/5rGKJAdoNtYKy5L0d/TvItd06LmGTJE+AS+D7ClUL7QnrcGcNK+Pm6UnQbyJMX7UmZJmOwhPuXZXmMCeLtRdYMPXeKfr/kcylf13+71n+2SdjbSBzkbPN9H4Prl+Nc0SF88rQ8cWzbkRLvdQdWEfjmOJhal6tObOokGuP9lXJOtZxc9x1H3quvdQyYnZ3ZFhpRGVnFQHADuHDlJMoM7hu2EktvOvs0bvG7Cfqv/yk36MPs2PChV9YS/5pfK7CZRg1+VQbaAeNskOcIYZUHIQyJHZwwO4M/JExkiGd8/7b3SYxgOlbOVjiPMAn3HflYe6063cO4Kxe0CpyMNxzYQ+LsJ19YMdzrf3P8H/nBSPefXlfpleJ9l7XBdel4/41ksn1DGZDyuobVb5RNdg7ru8/Xjjj59zroLtOB6L7SJcSp940pXxKykYHEeIXc9f0OoWBJFxj+AAlwOWdkfLI8iI48EvDUf3sDatGj0y6ancZ8jtXflicWQZ7cvjdHniU/8YbXzTObxc+rV58mVmcNiKY+N7DfNL5Y65Fdbz+sZBirr5iy0Mp0JXzlDPbJLV/kZaOQuCHdIzqbAEGXYrb7ejEzT8Ya/2UYGg8DcvjYZ8xTTnmluc5p+iM/qMMYAJZx2C9nOpmEujrGjY5H9ele0M/9CRsLzhxYxT4GZcdpKBIhk8G+b6Rh+E9dacajn/VdtDx6+/ut9kcXwlz7t3cdga8BvyvLo8W7P3T94oQfYejf70ed/TWWfsanzHVxHnJAPdnxKK72lUcB4KoI1bsMUCZ+wegfi4u3zcZKAHjU/jVkfxtyWpIwbswGGWid6TbS58Uqu7EQYijPckVz8/4Fboii2HsLmQIxRQAc/a8O+8Nz/nTCZQNlywGCdtzpBw7aj+savIcBYegp33B/7U/o5s7Vk21tX7JDl/1SvnMSwlu0xytRXQne18CnOG+DNci971khCgSbDzOyjwrOPlE/p2fbv4y8LssAqUh537b/XR6gECW4kHP1x2Gv2DTPpcdvHMQI6UhCwHo9+Nf+N0pXMBRG01EBbr15KIMCKl0QGO9joUCOaEaZrcDRyjBCK7UaOViKZBDvVuSznXDdLX76533fDEljpmmwWlonxwa//mFs/8h4p9c9veg0Pl19XEfRsW40NkurP4qROdHTMlOWOpZ0m8n6ZTaAA2gBV6QgMNo/oASr3CYBGfjGUT/p6EWxEF0Istz6FHgRlbc8ZGxNcClwkZANRjWtQNOPCbq+YOc/4Q0nwlxZ1gE4Gwsm74r33R64PapIcggjBBqgKepWBcbtgLLrLVw7o7HWoQ8CPSmHrEdCZRMF7DsYvfFUD1i5+4eKUKtUee9OV3etMNFVJQF+e5S6gKpWPrcdVdy/dsHUirUXKkJ1dXzfZ98m6E9A/7dRyl5unzXCxmdy1L/Ka+LkhLIaxD/cqtQ2NIhv9IqJVBa57sraDEE9JivE21h1Aqfd34HmjroLjOuCIgP8NMb7QCGw+qwadD1uVQxD91Lxfhboss8VTnrFu7D+29B7PRmXDKu/dyDohE8j86er8EPL8Fu83yg0AhBG69ZpS9pAmN+Ws6IirDMMFfJljIJkRVAWNwJqAQga1ah6RgPukXEArEqIao9MDn1Hrr5YG6bt3h9+IeFicFkbttOShEMKBDZ79XH2PfARwiH2LUz6vPrf61dQM/4Ybo6w/Vz9d8MDBUjkVylG5njnuqlTj4jEh+knWtvW1AoC25+7YRhA0NEhXdnxJMthBqm2bw8OZqECyQpi8J2vROUAhz2rHK3EldWV40Oran2f5gqo7tVHMbLCqvpN6EjqKjiCovwbVsTfoM/xm9e9aEm+Vr9CYBVacuL70YXJZCqU45LUE0LIRBV+L6QCqw0X7vFi0bXqusW6UNIUzXJA2NpXC2cc614V4MXk4HYD+pBdeWektq9xsuIZ2FfEVCbf6yxjIBLF9XLP/5wJ72/rEze+nBbdkgtq17gfC1URVJquzmOzcJ7rwH7LjqKqXjSWCjoR4XjHTpGo5Pwk6l+jbL/6cNnJ7BrVlUQcUm++6vlCqAryrL+9GPV3XoHrEsA9eYM/tutKbPN+SeGnLEB4xDi4+4rIAvy5IDOR5Dz4Zcr9c9Z1H4ySPi+/VRYR7zMpRXicuBbDrIvBUXV2xNf7yy3mugB4a0c/X3qn0ACNcaVQxEReKuy+sUCgFAB8ik1FEDkYeryv+vURAsiS36B3eKj827luZQNZN6AiR54Dx214/ZHsBrDI17m+0/G+n2tKjNPp3Aai+W4qkID4UMIcu667ANtW8AOooLzWhuHIpkpVDffVObgUa6VoJvV5ZZSTvgYpkqN+EiFqBEorRjAnmdki7qwyZOZI20GYEOaqGicDCfz+S7XMgRSh3vc3OPM05bOyiKTpAhfgqMPsd36UUKYnZzabqhxsfN87p46cS4JK1g8YVyFiIb8q8Mi90MHAPwgMHGffSPqs+GTjPOVgg5lGosxrMlai/dSFW16H/bY88Lp8W6CuTDUCScMoxCPScFN8/icnzPD4xDgrLeKx9frtR8T5XYA8zv5JEAK64DAsyTAuRNBsbgvuhD04bhO3iI6sWEPPqm2RkbX9djBqhCHGZ4WR8MOSZPBdg1yJYMKVLLfdB2I5UaBU6os98+3pNgByVOR4Yu7/v/424PEnQysP9vIjC8tRMV8dnh5/FfNo7xX6YTgnJ2wKOVBZ3KvPCAff4v5yS7y2IP3PROPZ53R19p/MZgMl+81ra5iWEA3YVHg+TUqhFP7Gs1XbYh5uZJsVpBGVhLhFR653zMNiAxm7+Xs9IEeu+yujZMI7+hmbGv1z9ur7rHkdeFzVDhmS0uAO92ug37Q/lF3iOzdnlryqxnkIToDTsBdFKRjYc+EKehtp2FSi+43cwShhOhfiPpRtEVtApWNHZZTsPCeXpSJdpDJfJujq3DWnIx4Ek81z8hnkxPJmccbgM3/F+wdDtG6+CA1dVSd9U3sDPJlElc5rEEH16ivZqbPvBOP2Gq0ESSCyWwHCYdm6MmNwYqAyjAo1agDMs5jVNOfXYGrg4psngd/Vy6TsohmDzNdj9X++qiuqfOjsI65K1gNI5ht1EmS5F0OUC0sMaOy+wlkZRpA/EZmT9HDv667rBlGKASXyzkUBRwjby4gEgetIMTuR9G4oFJdpFVMiYbW3OWI3wHbOq+rmhTDvn5lMwIGXNyJKzdVHpMsEP2EM9lf0vgRVvPw88JqEhnP1s51A4zy8IkiILA97MVbflG2FWLGjulKAXdjA0evbBm0LqIYDTwX3oc67F0PWuKAgktD9jBPtos3W+gZ3Liu9AFTZUOP7asLP503eOcvuLMjsJ3ALydMKh6UiHITTlc42AjEtHJDZa0LKJ2o/yFJu7+xcd4KgPp4j8/MWp0FJpOyDA4PBTuekocmAgAOqJCtdnS2Lq1+M++118Z4xeLLkcSIEWoA5O1Vuik5H+vf3eYu6sT+04/0diemFhnWvpzkqXMGq7xIs6HbUTVwJcz1wE7PyAcd/lYhhAdbJ43xUFsWwfFdxomDxI28gDA/rkQ0AswbQAVWumOFTs53H6tf1ysEKFU9WqUBV29uH90YLI6pQfb/hO4SNsuUmdZ9GxAms1sEXcPBMRUJVbHUZfU/BoDOcyb1Kr/XNyzwMS0x/EF8RZ31vH11zFxc65sEnEN1+PuF1+xcSj9yY649uH1GeA6W+0VlXEWeaHatP3F+lGBjVVVtozR0vr/vuMLf8NhuMUj178ropmu2dQYboz1nkHzHRGaomayPsAUkCbK9/wLzNfD6YgwJEf769dHYGoPiBKFvnrggry0Pf77Of4LD7i2dzdk/guAVo9ch0SMGxjnkSjp20qjDiybgEHsFQSpX9VZUhNNdVrhDWyVoMjI9+mywNtWMAZaOLNea9yItRMt8QqB1Nel2qmS50dk/MAF/gzKDH2vtAGnAZ64JW78o1cJsYZQ2guNVn0sglyTabx3CBFmcKaWRwKiEavUTkhhr9LWj7jQBHqjOJnZEfr5vdJFJLXyv94/lWX5O8haHij1cDpajkgNVmgxF2ExeIFYtK67yu40ZD4yyXx87lhXH60VyX6qwLGQeilMcVycb3I4VXY63VE2GNtn5isPyrj0YMUgl7cbddihSCLUAzBGZEVxwXu18UukSM9JXf5030t57zJtcuprtO/aIVy7siogLNcKtSi9FfM+gRtYhI9OpYv76J/rO0Yl2oIs9oZgg4+07eNivjbIau1d+kxBvpDLQvw7cVEESrtcBbcXGJg7gNKykkdIqfvE9yo2yBL7zYnZCsJRgzYSRTgVSrrUrW8XB0Ov7cNoCwmncdWExTJwSQDufczImMyZNQ9ZGXsosBd5NedLyf33V2bw5E5pHNNtJgjdSrGjVKeF7usdZpWTealDE/OKAjp1yEaxDP1X+Q0O3VX7JF6IdeOd4j1S2tqj2yNhPKxlJ73dVg6+DOwHe+um/5G5VO2kwHlLQ2r2B6XSal+3Trhod3cXCktrXZ/srf3Ow6qVcTZTvP/sD38+CpIRppHQHRtWcuVn1xpGx1rzr4P1kMcib0zGkR8wBSZjrN7xYjmwkY2kJDGC9lF5aAcGRHWmSU4LZ1c11RQ7sDGw0gHTCSn0u+NgphO6D1dsu8JfuQOJzwUVU/vK4nujZV2/KqhE4um+qLeba4pNmBVQ340Hb5pZEJ5UKz+2fVQVPntEe3aDtjHniLtZGdIv4v3AkeVUScynMKj2t2v1jsqzznQngTlQ1ExdmwjTc2p2ipjYmdDIIkCnTjD4sNDjJB6AQlFoReqoMpHoPKkbNZJbtzqHGLzDzR5jUYHzlYEaPn/Y4Um03lBN1GTqdybrBZTgVF3qRFCC+I+6NKI4gG2ZZVYT3Q5QsOaKDqy8PxnulxqicQnZk7/LtjlKv5jXcqcAAMahWx0YG1jZgXcgCECcvwshMCXoPHqYQxvjqH3odtyUlRTqK1BDg7P+J2wvgOLpvsRZu71fi+wM5mEtYuBy1D8HBt8prQfABHcOxdXUk2UMj+DHCiGeptatCDtK3opfYbrz9tXr1fjFZVbUxxW7jgYU5nwejgNaOadXaYTuL/7PPKXSD8S7tCXv8S1HPKXzTlqvVgWF1hnA5kj8XOUz5gcNnIYQ6YiIMUPPggRkqhbgA56+yzKLp52ffCKReCK0JGbbUr+lwLOG6Ocsltx6M4EN29lMlsi2D19kRszJ9l+Nesqp84j52nWMRCGxo+BbF2t6IN/kQ24NUNjsNx5Sz5dpJcdLPZMeqtBUAGufpSCA9ODrPBbahhEgE7dHBWdO8KrLaq6j4Ay0I6Qzl2lw0aNFTnaaonsXJdcZZkSLxNMZtnLjjh9UU3P3j3efB/8tDtYbZ1dgZEM7/KeXbEucDft9GHHpFDJWN2mTlCbZEYShwjDN0TMTjfug19gAq2u41YXK1sEvpll3jRrE8NBmeJFLBkfYIrLXjRwc8mwMrW+ayQV/KxsR/i0hspiG2C8OJp96c2lfp1mxcdI9a0Pv62sIj5YC+O1Z8WI+nqk0WNUL9qRTLA96Vo5TmpV6t51kI1RhuFZ3ddUrZKck71i1wEjrqU2A1cDN72rlwmbgsqo7Xc3uxE0uJd4I6PJr2+Daw0wOC8usttUMPH4sLuv89a7lFgceJqWP2lnC26Owd1jxGwhoD7Wv2pEZTszDpVMoTvq8WlTu5mP6gBMatRHayTyma3CS78R/AcLE+1uBiZ6HWfwlO95ll2PycPjIIf3pXqVFN823Bqj8galt8GjlRNeqKE1K6SJlUr9h66Fl89i0DlrlFdGaub7LpmAau+eTMpFZBkmE5fqYTxLHOlbOD70DSpWNeV27IdzsnETx1MlvXvnLb85xILqBDmZKRPSvp9lgpguKBRZmajvcAjT9J+8vFRm1LvxsEw0Y+VML9EXhvZllo48eY/AEqeFAfiPLL7yV4J8GcVEcXXuVABWepIqijNnkW6aFENlDfBrW2Du5hyV7RecML7UtLrKQhsDSYhH8ziNntKbmmpgAWEubsbh+YSnfXEdsq+Ob2Lu4KYmKIkzgz89cVzHvo8JN0vk5ZXUuJtd80VPb/LpOv8XbqlVASeZKGDOg17yQ5GiR11XcD6qPGlqRFXdLYpD1NgH/weJAYEJu9cl7XoJLqwlL6i09HBIG/33kskPjYabbMlOIwVG3OfDCZFE7T82ayrz8+vRzP7b0iDuIJoUVtoR2YDxUDbs/WlmIgWoWo0SQliA4+Q8GQTnlAOFJSN3VqA6VcXalpToEKlhZILC/UbhnnLTEX3O0a3zwlFKMtjt+7ZWy3dfrAyOygERuRTRrOYKcnEwSWRRYSOXZW0QsoDBtcVXlc9i9bUwQ7bU+zPzGaE7eRz3wwhL2vc2CR/31r2pxs0ckj3AMYKlaLuWxgS1Wj5MdTr1+BR711xdQpH5IAWKrovR+0jTAeKsHj7maS7zT53hDaqR5R799nBSjaJBz5A4Oi8Ad7Nj6qIpR/JF0qs/EWA/FWCcT2qlQR46n78CO9hmYJ2nMf5PuZs12J82Xafa0r5wSDhGdAQCBNOMcMd6ac6h5QMFyKdi62N2QxyMl2peBKk+SN6qB7IXn0TNdGYmnV7jPBniHzp72ip3MaK+3DSRUt5yMC8h6hbI0bW/H0w3fpVy87aViENoxtS+qUCacNBpB8s2ul1qWzLmEfMrEQ7nLNzpvUPG4Nk4TsGwVaQtegnyyZ6nCTqINVppkWOsLj5N1VQpOyfE/fullg/W3i97X7fvPIBZ9fcqJuzwToOSY2ZCsRQhexQdakXVUqOgxS0VGahRgk7EUWJJWuqu1P29ffujg/qURHdrOuC1jggYs76CcJW9OsidhJFnJ5vHy91Twjfj1FFB3sM7eI+esRwCbYhwbPD7Ln0PuJRp9l5DYwTh4wsGtbehyahCvGwwp4PctBSB6F3/BC9N8HsRs0XA+fxbFnP7elZlmFoKEjA2bcl7jGtDTn4UiDNdqeD7VtyNWUQqjnyQt7HAJE22aeZ9YGVJw/9Zi36JNLWfkzIDWWcPvvamtfs21psFzW6gR2QlG1D9IZfyG2kQGrikdIFWeADqaTlCdURk7Xe7Pa5tcblVXdRiqtDNawcBMUL0m+QpmVZsaTrYh7SqUKazJBNgt2M91PgRHabLV7ucXRgqVHJh+2wy0+NgXa83mzPpBMGj3NK5QmM884Ymf3CJka7a4iUhw3507ODWyomMbK5IWILWZdYgG1Yq+nMYLGSbgr2EUri9wsp00pCeLFRlPFoAT5m4DBHTslA7/qHsfSG/Tjz2IkmpUr/9QEPVr+33e9kOI+/er3n4c1ujObGJQQZu0ixbARLdYp69SUDo8YoCDaFwzqrLr4o7putX75r8WCUDKJwx+HOTycsCqwCd87YA8xQ1QukxHKTqZDRuou8fEfZVoZ1iCxQvdiO6BxLyeaLxhi0B87UN0/TVD+8DoqnUylpa5Tc1Awk+BvO9UR5s3nhAfEK1CZEBxJERXmNfVrDu7wX0u9SiJJnri9Wc9HihgWXJGeXwu1tIoCmMozISfAflYlqC8gmeIkSqsqiNQl3xjBHo6Krfy8LM7Xw2V3U23Oee+f2bScczfjMBtp+HGX7vI3sBtZJ7o3G3GyxmWsog03UjHzmbuZa6p4YJFzqXWSsI8RiZbGhJBw0KtiyL5ekt5ByTFKgw0UvJsYp39D2gVhC00NH9mvRK6qq+twbo/woPS0Sqzr++xH3k33lIwy9EEU0EL2P+t1/MapULeSgyHUpt5q8l5x9fVx97/5QsBzatuRgnKvcsQgeiM5HxJ9UEXo8cWAFmbE3Ub3qY35CsWCg+WzZezDgrG6A0SlWniEWvjfvO3nM/cvTPv2wdmJAESk4UzBDFG0EDy61GMysbUnaiyLXkunNUiy0oP8YdV1XzCOdZ/RtWbuEGKCISEGruWxl7oEqm3Ko1Rhg6xZuQRq2h4L7Jlo1eoaaANUltk6JGFlGuwfPRheY6zY7y0/czY8qMCBSBj2v6t5bebTMmVXNfRD6gfPkpfJ9a3xBm+FSJsGFaDWl7M6howbAam1P/kA+Ea195DT0/f3FU4iCBJcrNWHClYperoLhQrNJ2hioS1s95tFMwkFZTg87OKmeDEnlY92bZOiDV4v/+tkDzLzsJSZhmcKrMU5sNUsxSfFDyoWob6trikhwMglkdpGAepxbDC8o4rvvCjytektNfbmucpiRQW7Qy/W3qkzisqlX3Ug0MlbVPYfa6hSx9UH9vMNTo9Z22/Ts7OmMWZm12UjD1C4x815FQXq+vHGDcZZSOsfaafTDwpUpJZzRcS0aLZJepkguhEvN/INFuzuBywYsV0pMLjTJOQIKnsXenbmLyM/farM5nV0FnHOBqLK7RHmKO0WQGEi4WCCsJI/QnvltigUdPtfdh7+YGVAtt3+BEPzjS2qowfIbL6EQ0KptFMRvZt08lLPaBZxnZY+QaHEMaZCHbIszFnUFKmYia+Il1rU4RIrAPtWNTn0eI/uxVYeDNwZx1MFhHos7isBMHeJInVoHhkVXD5/J7ikQgChT8Od8p2xEGiZo667j4b9a4D1IwAKk8t5jKf6STTQVUhh6AxDOrv06GOTMoGtpFn34EgFf8b502TgAANBCyEy5TaY41LM0WkYSMkZuPIYnhJQkyUV8Iv4X2C7RibwTFUOPqrMTuIWrlXO1WZeJ8oPQrEBohqq3E0ZkkgLIYoxGy9Gas9ZQ3xqCgZn0qLPgxZh/TkSL7IAlsrmbPbCFcDTFMVhVcY4gar02H0App3fZIGMEgpYlZpoT7s5Bj6KYs3XnYk5MwmYPCiZ7OIQJPEeF6wwuFY/meU8UKcl8vRSGD63GVm1Zmu0FhHkyZ3OwBLsYKWpGUC1ZDHKvBmil+EyaQoongslaaHPZ2a9+q5lJGSyDCMTiESXLy1g78qEvXQmgN2Tv3hPNakaP7sQArXuu3OFgf7Mzmb/IbSj19ZGUl7d4CcJU8zzjGaQw5EVJZev+zkFJnAUSR88c2tAQgQRyGlhdkT5hDDHjNUhUacxsw9XgudTVVTL4i9BFtsoSp4kQ9glO2BGwrFIU/K4LO8q0nh7jNkrqXDNldk5AYhr6PDVWXSd93AMfd8HHC17dUeDLRuKzMJSoqPdzLI6WihI1tP7kicC4p+fsSWcsNE7OkJ1l+BSaEUIMcJHuaupdkeIU0H8ZFuY/0d0TZJq4CXRi6VxxNrEaF8VRnb0u5rqfIHyO5XfvFffhDKZpSpmdGTjd8wMaw2oKfwXyG2lYLcQicXzHnEU6sUX0B5BDjhh0P2VNurnKfqCHQF2P0KnSfW+VwqmOtAZPtts16ScohMV4nDhANrwTqejWR7Aovm2mvCvq+Jx14Ken/SXyoW050jFevnnwVUZ+dQfWoUSZaE1xaXoK7m/0WFX19KYy5NTnQYeJwFFVzzMGVtNiwPYuxTf3DvOrGDnUkUI1E2PkCn0e6n6UYfE0dYpJY6TL124NulG+ZHrX3rMcTvX8eSZcPo+53odAhY8LUe/v+3y8WPCbvaixVH7rMVsxu1lby8tafx/xKzkNa0STywcfl5pHqR7SYnM2WdHApd1MzdUiRykW9CjB18UPKrFGhx/erAxac7o6H/ITamd0jmdAznw9pbN9sp4b4DzqX7BFV6v7env9WY7fiPPdayQqzuhHsmh9pUndkVJAKcS4HfO2JpcNq78AuqWq5Lv3ukPB1kENRagYVAEy9dVU3CArdnt++Xnyn9EPPHrh8kjBLHjuAa6NaSoD5PcjxBklMB9BZ/4h3qfFDvmDIxMTbuE/tRWvFN+tk3VwmFWQlCpXsDGxIJeVGkiW2WqonW1SFSWa3AHxZNFgYTUDrUVioHB4QuN3wYEUmtQIA3XT2YqlKnPPTg2bFt5G1T6jQ0+hDD5AZj8Iv8057xUcTtWf5sX8pESMP915nJz+LdbhqV/isyl/dYqY3WOEMHh1Akyi5hZQVYIjz0wuG+IQVbustWibEQSo2Tr3CpQ5tyAqdd+iG0tNsj/FwFh9UAZ+QMkZmSOUmKxDasvG6LPhaBn07nZqqFnRTtUXCRyRleXDXScUU44dKdaimHGV3y22uost0oovR+v3rMAEDyer9oo4VUKA4jjiKKo0Y7oxIYXFLq3P90FX9ILXvXb9ZJDd5mwErP7WYPGlkFRC0y7qZ1Y/hWQ0OrRXQUEtDXlGL/Kf6WPdH2vqNvQSeRXs4KE4ZOX3b4X3ugBHS9tJSsCjsxRx7/vWp95YtOJL9q4kSHPVvQarQo1sNE9xglH0ICl0N65sYtN7CFuXKVtk0cJVYgAnGlluq6V5pmPJ1Ceq4XXUkNhLUDFbM0CE41fyPkg7Hcko9x9XoSGgfKJyfiZf131EsCe5JW5ugd+c3FCRProyHKq+stoOpYChZBhiot0Mck251DkVG4fCJaRMB4bj7K8fBcR7j1so6Rd0PfIdbrfsV4AYCwB1NTVB4metdZ2eQzreqNraY158CM/kCGy6fDh9rP8S8ORj9UcSwGz5Gn68duVS+fLVHVgUgIlGtXr1D5UMTjcmLtaDeZfQygI+paRm4pQj7hQfPbohmd2KjDitq+rZrGr0bSVU9zK7PdqYkammP5n+s7uxSTdHiRwrr0pWnuCaIA1vD/GkPdORi4eLdffifX1+uEbH2PUKWdhyA8za9yqD/d9squzpc5gWAYNb7GJMy7Fub+teO4xWh8SLZruu1tEGMM7aFs6gWBGXIhlDn4WNORdnW/pgFtc0WyNVdBRNOjEbMyU7mcoZ5meTG7QHw1dcrsbOWSObNOh6Rdmi+49XIasv5iYz+GulgDhnzXGkYAzNk+y5KxljRpwKI0GdNcQ/OwYV3jxoIBCGI8PQDrKxgs5AMb3jfQBZ1olxiwU6RTlaoGTkvVUL2muRw98+0wA/67recCaDmphbxSfWrvz4AU/sPaq93L/NS4Pe7u4Jk5YL5BlGQoDKsVi0wcpiSvtC+mWlAO/SuG0JixAACT3HYO6dlzWFvSnK/Ohl62dbPajiWc94oaryoOx1ZVGtqaJM5YEaJ/B9aSod8NnQkpnJV/qvSvO8GUAagprke8VNdS96BRVkWGTPr5nWoSh+chpSolujp85qplzGmPSwcnIuMd2G/nPMnM4csy5Z8JHsxg4u10/CPHbM46MQbfM3aQsu1qKKSe7ZOmDKVx+VRX8O8XpyquQGRveLq8vFL8WeWSISSNwckWjt8v7jK8foVoSKvjpueXAaVF0BpVle2jSpkaiGBMUGm1M6oUMFOwWLMtHtETfgccYYYtSyISrw5WgLVW/M6Iw4qPokm4ymLWNF0ptE1bvgx44gs5wUB22Ks+Qib0yNWyf2eQ07dO3NeIUGplMpQAjJmirYNvaj23fH0N1uHEM7mFkTmCVJpQkfZazL8vj+aIBpINtki3pC/WxaXtTreOJWT1Mjij/biGRziomUVVY8+CNP1MFHhUuL+2gzetTkMaDkjs1oxu4zf6FV2y90jO0frvtxl2oiO4nmGFfO28g5RgfTznCul7N9kTNrQrKPQn7QCbyaB0gJU7PD8mDhimnsKqNXcFXRC4e3fFF0WvzYY/RGr3MVm9D4ZPqca2ozvsxJJm9T4+fyjytSEGU30pUHqLK0H3jc/eRX66pvatSAH9bIyIjvD3VzMsiR44SvITG0NM4mJjFZKtDOQrwmAFIzr6RlHFJrLZYt5vfUzpdG5Og1m8wfG+VfjgS2oyA1YX0xEn2CawNxswPSaXc9iy0IVht7gN2/4C/usx9Q9dwmKGGyV0tdb6N8DTls64E4h2xojiGWg+S9WiGGcxJY5TmauVLlMA7nS+IN4dQ59CF010zbo/+2QlHvGGyU0m2yGcP96NRVA+nU8TkqJ7OANRlwR99pTZjAWS84u7IWdxQXXP/KK27rn8ZI9BWsiEVzR0tGRFrrKebsneu27CxtREovUnyhqokTHaOyQPtYprhjWsISHzc4FWHoncaIHUPLl+rQHhR2T01YLr50zipgOqglHWWKPk7P4V9SqDMJ8JPucNqf05rl1c6gJGXu1bedHOB1L9Yjo3siRvcEo6DmBOUg2/gNwMlkdUpcGuTLWs2lSibLzQZN6iDnSA11u3/g+03CbTauzSlHkrNKJgTq0NfgPpeIUbcQdb/Ko6gy/O38IYfDQPTZNudqRjqO/CWvW9Bz4T+XNSmaqfT1Ood/2Zz4JBVsSTqWwmrlVhibBNFNSj+f42VK4lfLNOa3RVPcx2Tyqiwu1AOE8IzOobTW7ugN1ODCOHEyewqXPPCZ/HrkkYJxrUc0ZZc2TzK3KCxgoVW+odct4MERkhow6T3NFBWxlYJ0Gt9f7c0Ak8Ws60483XqgpcTbw1hmofmCXJaZUHv2IluPmh/TnO2hQS4CL7Dsbpo4EaCJsqlEnN2vMpfYc2gEjPgEOIUPGzW7lCjNKk6W9wAwvwOhKrB5Ya8XFnvGS7sYcGNBoSmX3kOmux0DIPC0Ej33tIsbG9kn5eMQ7CpbdI1GMGrXHXPJNI83ByeFbjYO/S81pY5+6C5DDoxp8qIa7FQeO7F+H6yEr9zYHxNJcWmoglaH2i8k2giKdsNAlnny8XxHEyvjuZdGi5qN2ROsjJtaWaSvucsgbAobHVuYjKySDqbXd4dQS0MnmTasZTLbumx0/7T49WXqn3GqZPTdGsJJZkNFOGbkbnYAzn327Yz3v1hvX/X52oOL0NvFg4+YZ5t+T23SkWG4+zVIFfddeaH62ETl6ZCt541CJoopo8dUmB9ME1NwWTMmEM4/mmzhM5ttCQX7oc7YtqI4ikXcbGp0z5kYpt/OrrmDt9M49LgTs8xrj8ktfvIJH9N0tO4baeCJvi7UeCoHdm2DV0KQox5c5NyOeXj21RPKY0UPkd0Fb2r1MtKkcw6BKWx5D36DNswa7Kg1RursUGpoH7RXqJZLUkuobJJ2eMUp7yvHG3PF7bs7jlBaTvDHDy2ZKWsyy2S+c6sDYa5KS/1V/Xe/kBbn8p7Djo2oXKGM0utRVecIrEXBPDW1WPcttaTl7Zkv9i2lS39/WQ2hIiMIxOOGAUCaW5y7soZZH1OLjEW6Q3IwfQxsmvQzuRY/Gobcnj7WvsuIXxweVdVPlF9ZcC3lDx+6nKoee/Mq7LlmqArDIzS2uKFsgWslhuCwTespjKuzLdU3fJnbYBasGS2nqiuz1Z30/xKAWz35IzUEcH/nNSczjel5doO7xyCp5jewLw6xrn11Yx1R0mjdcrNHz5d/Q9C9rNZ4cl42YE7FPBfe8tKWkQRTf/qZ8wEGM079EWQ20NQcrBslbuT1r6F+t1ROidYPlNRR6+9nZx7QKOkUF28imcZUDWSqRtqkIKZueUy2mnys2+Gw85zge/jyByQnnMcv2g8vJ+wUKN4/OyDPfpOr4J476e3o6IBQawzeC7VGKipXCyMFMUh3fdAFt1hHtCa19eRXuHRScVsaklGsK6was+ZakzAlEWIa3yhEKIfuok8yKy/BMC/pDz7D4Qkacrhj9rAHonCc+pETwMJcXNNrPnHHatdl7X5naFDbM17yOYnXT3qJd0tFmcw1t+5ZVCEMkG9zGtK7g06yllQGG1x7NpzabGu9WXXdttLyGGqX9B6YKXmjQ6oTkV8qls9vHkMOy+/dJOSisDVPq5FTO1KtzaKt2Z67hjXEgarO3rnVlT7LjVaYRDuUSz9c/NxXd75zGpA0YlKoL4XuyN9SB0BM6dije4IJKiwShyFsBVeUIReF9LoHqJn46eNvOTlB44iwNjnJhPmsFx6W5CyN61ArQ56tW7TWoxlPGCfy3x+fbtk39YpcB0Bvm/xTZ9/zasXi3Y3KEPbegCqtTCFTCr2Bu7EkUY2ZQ97jtIrav8goYYuvuDc9dKS87tViXy176CzP5jjvUSsuTmzGY8KiSR2xMiOPR8h/GPqzj85G09JjiJEPUc/aMRqfS+cafhjhzHUxrrm6B6Yxn67+4+wfrUqvR3/+lHshQMQGjW6LXEImKlK6Ootu1fOemZXoGJUmpnUz9+h/w1w3DrPvgDLncNdz2RrFG6Wxo2doDNixHrkw1IL9LK1oJQEh1HG+b0OlutfVdcr7aF84Jhcy4d6nwjt++Mv7SIy7nvZanLpe3XE9+CeH8CCJt6VoxfL3ckb0bBUOJkFLx1ajdDekgOkHAte8523ZaFrnsDLJy4/AUDPx7OFg7cDr3c8yi9Z6aMy0FbKz98jVRONkPjeAcRugvZ4/yVzXf5oQN2iJtfq5wYnyDVdODY+LNWHnSOtDN96aTGi0PLnmLB7pAhx0XpfCWuFuqlaO+UZ0l9HEkNGc3u1BsxTjg1MeNtpHH3TlnFWtSWGbt+HsuLPBhHBEnHU8HExCuF9jRaWDHM9ZurnOrqSQH/4s2k9fjv5tX6npD8rFjM2hCWUwYvepNWVof2dblPF7n3KumoHZ9JOcxM2Edlv+0rMY51w0lvLZSz0lv0acd4Br/qtq5OhTNH923HlFkjOQN/KqTru/FZYuoA5lndCWpMTumvH+AI5A13WGHi/NUeHcKpzrqQCvqb85xoYPLhul8sZQDPUpVn7nqTFhY/D46CVC4tWCnSrqDtervRxGNPNA0x78/adbtl84WAoivTqHcvaTXiikZ21IW/kfAW0MfvwReHEnynhcHS2XstlFwaYWliVI6dQUdwwgsRoA5Yf4zzWn3miEJuceOfU4BTU7kIZWPFdfrtqevOf3tVJbdnwe6jd/mh1lvGfj3PQBQxnoaJbLI+TnxXAhl1h91g/G40qMTRTdnKnWD67UpcYzmsNrylYKqltUusXCRQ6dLiSQN772Y8B5Okh3TTLVrLea+BTi0uagGtqYsAwBJAm8ez7jxNnb7U8J7Dwbz20Ucue6d/71Red34vs2GIPuzaq8QGz2C+fdWn4CglAIuBrn2U14e61+WsN+I6aPoeUvztlZGnrOvL+xlwTzeW1tbmnRRuaYcukQfcGkIk4mT0mPN61VzM4cLNfIId1j+UBn4qDBun2DB0l/eJCZH97i5HrqfQax2Rkagcs/UtkT2kQrwGXaKy8+zfVDWuDnBoSW/JGWSzOuGSWlBJxxjH2V8GnL9caYcDsGhjIeHTzY1HMocKp4iQhz9yRNSc7GmudoCfdhSaZa1XSt37JgpziGfUPQO5os0WcUF62dql50NedHbTVXF3eK+0/dvx/u1k86P/r6bhuoMLQ1SLc1H3So+4d3tow8WwQAG4RTmkQFdCS5HlMDD1wut9nyp911YZ8uboZq3fyt8mhb9EmuGh2jeUphPC/B0zNXRnbNBe3iiV8TnLhox8vQnxfiQOV+bOZio0Xpi3mNecLZpKjs/tgUG/k43akm03vhluIWNVsvDbLJLpo3sYc2TeSUbtdqFERzR2zy+o9f358S2FMS5nh8dqY/CKAoQqu0cs2y7VWcBuySTrpM/OWjWrO/1M+uznxsTpAA4d+/74N9ITCOo5wk3jmsQbVic5BW2JhWYqSwAWXTnrUyE3QRexSfvFgPWoGGD1hZnRHFITU7ph5zTmk3rftDoXMK+9gXpDxQ5ZxhO0etOfA1NhLtPLYTiwTqMHhdFRrdee+V14O5+4zTHiZILerRMzxC/UA8sML3zZr417RLjDAQyuY2hNtUqUOpPcdQrTymuNBLO5vCRoHFhzZM0/ZPUeGnOPxvAg/dpwiAXtQr92yO21dtC8gPOTGDhrX/7qfvwRFnlem3b1khbsMFKj67gnJQl5LxPmP/o9kRrBNcgnUNtdlUDX0YmeyKm7Vs1UH24ARyCd73fpwSPefpPtzDiGCHLMaMQS+gyk7zfSvjVczDeN+9DbnPHNieH88nbzN1+dQj4KXxL5bGjERfWe3RpokrUucfXjepFOAa8ba9glP41EW9TMkb9QTLHjpXx7YnKjnhTx+VQjF2pwxDDsW7OZCimZr+1d9rT3WkSlxdWGiVWKCge2m9r7zUVT28DxFmbFsT4ctMDfdQTShXahMPivvxz4t9pkD2JVwLjZJe/aHii1w3Bj3/aCqaE/1M8Q8bKOhyDhHxMXEgDipyPlV6Htrk312hDypK+fvLiCYo4ap7kGLX4lLcDHLsxiPO+V49HxC/ljdkdn71uo/Xv0h1XuQBrhZz07CMbmJpyL6qK5D0G1BB0zdNZX1yue60Rb+M9GrHzG63R6uQnfXYnELNfng2y7OR6Jn7XBvZx8vSZS5gKC7G6WimYDlsrD7aKx6I0nXUj2un2fr6tWnfj/yPAAMA5errTTs2B0oAAAAASUVORK5CYII=";
      texture = GK.TextureManager.loadTexture(imgData, true, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
      return this;
  }

  this.loadModel = function(model) {
      var vertices = model.vertices;
      var indices = model.indices;

      vertexCount = vertices.length;
      indexCount = indices.length;

      vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  }

  this.draw = function(camera, time){
      if(!texture.loaded) return;
      gl.useProgram(this.program.name);

      this.lightDir = vec3.fromValues(-3.0, Math.sin(time * 0.001) * 2.0, Math.cos(time * 0.0008) * 4.0);

      gl.uniformMatrix4fv(this.program.uniforms.uPMatrix, false, camera.perspectiveMatrix);
      gl.uniformMatrix4fv(this.program.uniforms.uMVMatrix, false, this.modelMatrix);
      gl.uniform3fv(this.program.uniforms.uLightDir, this.lightDir);
      gl.uniform1f(this.program.uniforms.uAlpha, this.alpha);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(this.program.uniforms.uSampler, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

      gl.vertexAttribPointer(this.program.attributes.aPosition, 3, gl.FLOAT, false, 32, 0);
      gl.vertexAttribPointer(this.program.attributes.aNormal, 3, gl.FLOAT, false, 32, 12);
      gl.vertexAttribPointer(this.program.attributes.aTexture, 2, gl.FLOAT, false, 32, 24);

      gl.enableVertexAttribArray(this.program.attributes.aPosition);
      gl.enableVertexAttribArray(this.program.attributes.aNormal);
      gl.enableVertexAttribArray(this.program.attributes.aTexture);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
  }
}

/*////////////////////////////////////
RingDrawable
////////////////////////////////////*/

GK.RingDrawable = function(){
  var vertex = `
      precision highp float;

      attribute vec3 aPosition;
      attribute vec3 aNormal;
      attribute vec2 aTexture;

      uniform mat4 uMVMatrix;
      uniform mat4 uPMatrix;
      uniform float uTime;
      uniform float uProgress;

      varying vec2 vTexture;
      varying float vLightWeight;
      varying float vTime;
      varying float vProgress;

      void main(void) {
          vec4 mvPosition = uMVMatrix * vec4(aPosition, 1.0);
          gl_Position = uPMatrix * mvPosition;

          vec3 transformedNormal = normalize(mat3(uMVMatrix) * aNormal);
          vec3 lightDirection = normalize(vec3(0.0, 1.0, 0.0) - mvPosition.xyz);
          vLightWeight = min(max(dot(transformedNormal, lightDirection), 0.5), 1.0);

          vTexture = aTexture;
          vTime = uTime;
          vProgress = uProgress;
      }
  `;

  var fragment = `
      precision highp float;

      varying vec2 vTexture;
      varying float vLightWeight;
      varying float vTime;
      varying float vProgress;

      uniform sampler2D uSampler;
      uniform float uRingAlpha;
      uniform float uAlpha;

      void main(void) {
          float a = 1.0 - max(min((vTexture.y - vProgress) / 0.005, 1.0), 0.0);
          vec4 textureColor = texture2D(uSampler, vec2(vTexture.x, vTexture.y - vTime));
          gl_FragColor = vec4(textureColor.rgb * vLightWeight, textureColor.a * a * uRingAlpha * uAlpha);
      }
  `;

  var self = this;

  // WebGL
  var program = null;
  var vertexBuffer;
  var indexBuffer;
  var vertexCount;
  var indexCount;
  var texture;

  // Geometry
  var geometryLoaded = false;
  this.modelMatrix = mat4.create();
  mat4.identity(this.modelMatrix);

  // Effects
  this.shaderSpeed = 0.0002;
  this.bgAlpha = 0.1;
  this.fgAlpha = 0.9;
  this.progress = 0.0;

  this.init = function() {
      program = GK.ProgramManager.create(vertex, fragment);
      texture = GK.TextureManager.loadTexture("/img/texture/ring.png", true, gl.REPEAT, gl.REPEAT);
      return this;
  }

  this.loadGeometry = function(model) {
      var vertices = model.vertices;
      var indices = model.indices;

      vertexCount = vertices.length;
      indexCount = indices.length;

      vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

      geometryLoaded = true;
  }

  this.draw = function(camera, time){
      if (!texture.loaded) return;
      if (!geometryLoaded) return;

      gl.useProgram(program.name);

      gl.uniformMatrix4fv(program.uniforms.uPMatrix, false, camera.perspectiveMatrix);
      gl.uniformMatrix4fv(program.uniforms.uMVMatrix, false, this.modelMatrix);
      gl.uniform1f(program.uniforms.uTime, time * this.shaderSpeed);
      gl.uniform1f(program.uniforms.uAlpha, this.alpha);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(program.uniforms.uSampler, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

      gl.vertexAttribPointer(program.attributes.aPosition, 3, gl.FLOAT, false, 32, 0);
      gl.vertexAttribPointer(program.attributes.aNormal, 3, gl.FLOAT, false, 32, 12);
      gl.vertexAttribPointer(program.attributes.aTexture, 2, gl.FLOAT, false, 32, 24);

      gl.enableVertexAttribArray(program.attributes.aPosition);
      gl.enableVertexAttribArray(program.attributes.aNormal);
      gl.enableVertexAttribArray(program.attributes.aTexture);

      // Draw background ring
      gl.uniform1f(program.uniforms.uProgress, 1.0);
      gl.uniform1f(program.uniforms.uRingAlpha, this.bgAlpha);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);

      // Draw foreground ring
      gl.uniform1f(program.uniforms.uProgress, this.progress);
      gl.uniform1f(program.uniforms.uRingAlpha, this.fgAlpha);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
  }
}

/*////////////////////////////////////
EarthquakeDrawable
////////////////////////////////////*/

GK.EarthquakeDrawable = function(){
  var vertex = `
      attribute vec3 aPosition;
      attribute float aMagnitude;
      attribute float aVariance;

      uniform mat4 uMVMatrix;
      uniform mat4 uPMatrix;

      uniform float uPointSize;
      uniform float uTime;
      varying float vTime;
      varying float vAlpha;
      varying float vAnimP;

      #define M_PI 3.1415926535897932384626433832795

      void main(void) {
          vTime = uTime;

          vec3 norm = normalize(aPosition);
          vAnimP = abs(sin(mod((uTime * aVariance) + aVariance * 100.0, M_PI * 0.5)));
          vec3 pos = aPosition + (0.0 * norm * vAnimP);
          float a = smoothstep(0.9, 1.0, vAnimP);

          // Fade out at back of sphere
          vec4 mvPosition = uMVMatrix * vec4(pos, 1.0);
          vec3 transformedNormal = normalize(mat3(uMVMatrix) * aPosition);
          vec3 lightDirection = normalize(vec3(0.0, 0.0, 1.0) - mvPosition.xyz);
          float lightWeight = max(dot(transformedNormal, lightDirection), 0.0);
          vAlpha = max(lightWeight, 0.05) * vAnimP;
          vAlpha = vAlpha - a;

          float pointSize = uPointSize + min(uPointSize * pow(aMagnitude / 5.0, 8.0), 14.0);
          pointSize = pointSize + (8.0 * pow(vAnimP, 9.0));

          gl_PointSize = pointSize;
          gl_Position = uPMatrix * mvPosition;
      }
  `;

  var fragment = `
      precision mediump float;

      varying float vAlpha;
      varying float vAnimP;
      uniform float uAlpha;
      uniform sampler2D uSampler;

      void main(void) {
          vec4 color = texture2D(uSampler, gl_PointCoord);
          gl_FragColor = vec4(vec3(color.r, color.g, color.b), color.a * vAlpha * uAlpha);
      }
  `;

  var self = this;

  var texture;
  var vertices;
  var vertexCount;
  var arrayBuffer;

  // WebGL
  var geometryLoaded = false;
  this.modelMatrix = mat4.create();
  mat4.identity(this.modelMatrix);

  this.pointSize = 3.0;
  this.alpha = 1.0;
  this.shaderSpeed = 0.001;

  this.init = function() {
      this.program = GK.ProgramManager.create(vertex, fragment);
      texture = GK.TextureManager.loadTexture("/img/texture/eq.png", true, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
      return this;
  };

  this.createGeometry = function(earthquakes) {
      var vertexArray = [];

      for (var i=0; i<earthquakes.length; i++) {
          var e = earthquakes[i];
          vertexArray.push(e.pos[0]);
          vertexArray.push(e.pos[1]);
          vertexArray.push(e.pos[2]);
          vertexArray.push(e.data.properties.mag);
          vertexArray.push(Math.random());
      }

      vertices = new Float32Array(vertexArray);

      arrayBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, arrayBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      geometryLoaded = true;
  };

  this.draw = function(camera, time){
      if (!texture.loaded) return;
      if (!geometryLoaded) return;

      gl.useProgram(this.program.name);

      gl.uniformMatrix4fv(this.program.uniforms.uPMatrix, false, camera.perspectiveMatrix);
      gl.uniformMatrix4fv(this.program.uniforms.uMVMatrix, false, this.modelMatrix);
      gl.uniform1f(this.program.uniforms.uTime, time * this.shaderSpeed);

      gl.uniform1f(this.program.uniforms.uAlpha, this.alpha);
      gl.uniform1f(this.program.uniforms.uPointSize, this.pointSize);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(this.program.uniforms.uSampler, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, arrayBuffer);

      gl.vertexAttribPointer(this.program.attributes.aPosition, 3, gl.FLOAT, false, 20, 0);
      gl.vertexAttribPointer(this.program.attributes.aMagnitude, 1, gl.FLOAT, false, 20, 12);
      gl.vertexAttribPointer(this.program.attributes.aVariance, 1, gl.FLOAT, false, 20, 16);
      gl.enableVertexAttribArray(this.program.attributes.aPosition);

      gl.drawArrays(gl.POINTS, 0, vertices.length / 5);
  };
}

/*////////////////////////////////////
BigQuakeDrawable
////////////////////////////////////*/

GK.BigQuakeDrawable = function(){
  var vertex = `
      attribute vec3 aPosition;

      uniform mat4 uMVMatrix;
      uniform mat4 uPMatrix;

      uniform float uTime;
      uniform float uPointSize;
      uniform float uProgress;

      varying float vTime;
      varying float vAlpha;

      #define M_PI 3.1415926535897932384626433832795

      void main(void) {
          vec3 norm = normalize(aPosition);
          //vec3 pos = aPosition + (norm * 0.5 * (1.0 - uProgress));
          vec3 pos = aPosition;

          float t = abs(sin(mod(uTime, M_PI * 0.5)));
          //vAlpha = t;
          vAlpha = 1.0;
          vTime = uTime;

          //gl_PointSize = uPointSize + (uPointSize * t);
          gl_PointSize = uPointSize;
          gl_Position = uPMatrix * uMVMatrix * vec4(pos, 1.0);
      }
  `;

  var fragment = `
      precision highp float;

      varying float vAlpha;
      varying float vTime;

      uniform float uAlpha;
      uniform sampler2D uSampler;

      vec2 rotTex(vec2 coord, float angle) {
          float s = sin(angle);
          float c = cos(angle);

          mat2 rot = mat2(c, s, -s, c);
          rot *= 0.5;
          rot += 0.5;
          rot = rot * 2.0 - 1.0;

          coord = coord - 0.5;
          coord = coord * rot;
          coord += 0.5;
          return coord;
      }

      void main(void) {
          vec2 coord = clamp(rotTex(gl_PointCoord, vTime), vec2(0.0, 0.0), vec2(1.0, 1.0));
          vec4 color = texture2D(uSampler, coord);
          gl_FragColor = vec4(color.rgb, color.a * uAlpha * vAlpha);
      }
  `;

  var self = this;

  var texture;
  var vertices;
  var arrayBuffer;

  // WebGL
  var geometryLoaded = false;
  this.modelMatrix = mat4.create();
  mat4.identity(this.modelMatrix);

  this.alpha = 1.0;
  this.pointSize = 12.0;
  this.progress = 1.0;
  this.shaderSpeed = 0.01;

  this.init = function() {
      this.program = GK.ProgramManager.create(vertex, fragment);
      texture = GK.TextureManager.loadTexture("/img/texture/bq.png", true, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
      return this;
  }

  this.createGeometry = function(earthquake) {
      vertices = new Float32Array(earthquake.pos);

      if (arrayBuffer == null) {
          arrayBuffer = gl.createBuffer();
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, arrayBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      geometryLoaded = true;
  }

  this.draw = function(camera, time){
      if (!texture.loaded) return;
      if (!geometryLoaded) return;

      gl.useProgram(this.program.name);

      gl.uniformMatrix4fv(this.program.uniforms.uPMatrix, false, camera.perspectiveMatrix);
      gl.uniformMatrix4fv(this.program.uniforms.uMVMatrix, false, this.modelMatrix);
      gl.uniform1f(this.program.uniforms.uTime, time * this.shaderSpeed);

      gl.uniform1f(this.program.uniforms.uAlpha, this.alpha);
      gl.uniform1f(this.program.uniforms.uPointSize, this.pointSize);
      gl.uniform1f(this.program.uniforms.uProgress, this.progress);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(this.program.uniforms.uSampler, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, arrayBuffer);

      gl.vertexAttribPointer(this.program.attributes.aPosition, 3, gl.FLOAT, false, 12, 0);
      gl.enableVertexAttribArray(this.program.attributes.aPosition);

      gl.drawArrays(gl.POINTS, 0, vertices.length / 3);
  }
}

/*////////////////////////////////////
Model
////////////////////////////////////*/

GK.Model = function(vertices, indices) {
  this.vertices = vertices;
  this.indices = indices;
}

/*////////////////////////////////////
LatLng
////////////////////////////////////*/

GK.LatLng = function(latitude, longitude) {
  this.latitude = latitude;
  this.longitude = longitude;
}

GK.LatLng.radiansForPosition = function(x, z) {
  if (z > 0) {
      if (x >= 0) {
          return Math.atan(x / z);
      }
      else {
          return 2 * Math.PI + Math.atan(x / z);
      }
  }
  else if (z < 0) {
      return Math.PI + Math.atan(x / z);
  }
  else {
      if (x > 0) {
          return Math.PI / 2.0;
      }
      else {
          return 3 * Math.PI / 2.0;
      }
  }
}

GK.LatLng.toWorld = function(latLng) {
  var latRad = latLng.latitude * Math.PI / 180.0;
  var lngRad = latLng.longitude * Math.PI / 180.0;

  var radius = Math.cos(latRad);
  var y = Math.sin(latRad);
  var x = Math.sin(lngRad) * radius;
  var z = Math.cos(lngRad) * radius;

  return vec3.fromValues(x, y, z);
}

GK.LatLng.fromWorld = function(pos) {
  var normal = vec3.create();
  vec3.normalize(normal, pos);

  var latRad = Math.asin(normal.y);
  var lngRad = radiansForPosition(normal.x, normal.z);

  var lngDeg = lngRad * 180.0 / Math.PI;
  while (lngDeg > 180.0) {
      lngDeg -= 360.0;
  }

  return new GK.LatLng(latRad * 180.0 / Math.PI, lngDeg);
}

/*////////////////////////////////////
ProjectionUtil
////////////////////////////////////*/

GK.ProjectionUtil = {
  project: function(position, projection, viewport) {
      var p = vec3.clone(position);
      vec3.transformMat4(p, p, projection);

      var x = (p[0] * 0.5 + 0.5) * viewport[2] + viewport[0];
      var y = (p[1] * 0.5 + 0.5) * viewport[3] + viewport[1];
      var z = (1.0 + p[2]) * 0.5;

      return vec3.fromValues(x, y, z);
  },

  unproject: function(position, projection, viewport) {
      mat4.invert(projection, projection);

      var x = ((2.0 * position[0] - viewport[0]) / viewport[2]) - 1.0;
      var y = ((2.0 * position[1] - viewport[1]) / viewport[3]) - 1.0;
      var z = (2.0 * position[2]) - 1.0;

      var result = vec3.fromValues(x, y, z);
      vec3.normalize(result, result);
      vec3.transformMat4(result, result, projection);

      return result;
  },

  create: function(vertexStr, fragmentStr) {
      var key = vertexStr + fragmentStr;
      if (key in GK.ProgramManager.programs) {
          return GK.ProgramManager.programs[key]
      }

      var p = new GK.Program().init(vertexStr, fragmentStr);
      GK.ProgramManager.programs[key] = p
      return p
  }
}

/*////////////////////////////////////
Animation
////////////////////////////////////*/

BK.AnimationManager = {
  id: 0,
  animations: [],
  running: false,

  init: function() {
  },

  tick: function(timestamp) {
      if (BK.AnimationManager.running) {
          BK.AnimationManager.requestAnimFrame(BK.AnimationManager.tick);
          BK.AnimationManager.update(timestamp);
      }
  },

  update: function(timestamp) {
      var completeAnimations = [];

      for (var i=0; i<BK.AnimationManager.animations.length; i++) {
          var animation = BK.AnimationManager.animations[i];

          if (timestamp - animation.startTime < animation.startDelay) {
              continue
          }

          if (!animation.started) {
              animation.started = true;
              animation.startTime = performance.now();
              animation.startFn();
          }

          if (animation.complete) {
              completeAnimations.push(animation);
              animation.completeFn(animation.val);
              continue;
          }

          animation.integrate(1.0 / 60.0);
          animation.updateFn(animation.val);
      }

      BK.AnimationManager.animations = BK.AnimationManager.animations.filter(function(el) {
          return !completeAnimations.includes(el);
      });

      if (BK.AnimationManager.animations.length == 0) {
          BK.AnimationManager.running = false;
      }
  },

  requestAnimFrame: (window.requestAnimationFrame || window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame || window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame).bind(window),

  add: function(animation){
      if (BK.AnimationManager.animations.indexOf(animation) == -1) {
          BK.AnimationManager.animations.push(animation);
      }

      if (!BK.AnimationManager.running) {
          BK.AnimationManager.running = true;
          BK.AnimationManager.requestAnimFrame(BK.AnimationManager.tick);
      }
  },

  remove: function(animation){
      var idx = BK.AnimationManager.animations.indexOf(animation);
      if (idx != -1) {
          BK.AnimationManager.animations.splice(idx, 1);
      }
  }
}

var Animation = function(duration){
  this.id = ++BK.AnimationManager.id;
  this.val = 0;

  this.duration = duration;
  this.startTime = 0.0;
  this.startDelay = 0.0;

  this.complete = false;
  this.started = false;

  this.startFn = function(){}
  this.updateFn = function(){}
  this.completeFn = function(){}

  var elapsed = 0.0;

  this.start = function(delay) {
      delay = delay || 0.0;
      this.startDelay = delay;
      BK.AnimationManager.add(this);
  }

  this.integrate = function(deltaTime) {
      elapsed += deltaTime
      let v = (elapsed - this.startDelay) / this.duration
      this.val = Math.max(Math.min(v, 1.0), 0.0)

      if (this.val == 1.0) {
          this.complete = true
      }
  }

  this.stop = function() {
      this.complete = true
  }
}

/*////////////////////////////////////
Ease
////////////////////////////////////*/

BK.Ease = {
  inSine: function(p) {
      return 1.0 - Math.cos(p * (Math.PI / 2.0));
  },

  outSine: function(p) {
      return Math.sin(p * (Math.PI / 2.0));
  },

  inOutSine: function(p) {
      return -0.5 * (Math.cos(Math.PI * p) - 1.0) + 0.0;
  },

  inExpo: function(p) {
      return (p == 0.0) ? 0 : Math.pow(2.0, 10.0 * (p - 1.0));
  },

  outExpo: function(p) {
      return ((p == 1.0) ? 1.0 : 1.0 - Math.pow(2.0, -10.0 * p));
  },

  inOutExpo: function(p) {
      if (p == 0.0) {
          return 0.0;
      }
      if (p == 1.0) {
          return 1.0;
      }
      if (p < 0.5) {
          return 0.5 * Math.pow(2.0, 10.0 * (p * 2.0 - 1.0)) + 0.0;
      }

      return 0.5 * (-Math.pow(2.0, -10.0 * (p/0.5 - 1.0)) + 2) + 0.0;
  },

  outBack: function(p) {
      var x = p - 1.0;
      return x*x*((s+1.0)*x + 1.70158) + 1;
  },

  inQuad: function(p) {
      return p*p;
  },

  outQuad: function(p) {
      return -p*(p-2);
  },

  inOutQuad: function(p) {
      if (p < 0.5) {
          return p*p*2;
      }

      return 4.0*p - 2.0*p*p - 1.0;
  },

  inQuart: function(p) {
      return p*p*p*p
  },

  outQuart: function(pIn) {
      var p = pIn - 1.0;
      return 1-p*p*p*p;
  },

  inOutQuart: function(p) {
      var x = p * 2;
      if (x < 1.0) {
          return 0.5*x*x*x*x;
      }
      x -= 2.0;
      return 1.0 - 0.5*x*x*x*x;
  },

  outQuint: function(p) {
      var x = p - 1;
      return x*x*x*x*x + 1;
  },

  inQuint: function(p) {
      return p*p*p*p*p;
  },

  inOutQuint: function(p) {
      var x = p * 2
      if (x < 1) {
          return 0.5*x*x*x*x*x;
      }
      x -= 2;
      return 0.5*x*x*x*x*x + 1;
  },

  inElastic: function(p) {
      return Math.sin(13.0 * (Math.PI / 2.0) * p) * Math.pow(2.0, 10.0 * (p - 1.0));
  },

  outElastic: function(p) {
      return Math.sin(-13 * (Math.PI / 2.0) * (p + 1)) * Math.pow(2, -10 * p) + 1.0;
  }
}

BK.Ease.smoothstep = function(min, max, value) {
  var x = Math.max(0, Math.min(1, (value-min)/(max-min)));
  return x*x*(3 - 2*x);
};

/*////////////////////////////////////
Ajax
////////////////////////////////////*/

/*////////////////////////////////////
Signal
////////////////////////////////////*/

BK.Signal = function () {
  this.functions = {};

  this.fire = function() {
      for (var key in this.functions) {
          if (this.functions.hasOwnProperty(key)) {
              for ( var i=0; i<this.functions[key].length; i++) {
                  var f = this.functions[key][i];
                  f.apply(this, arguments);
              }
          }
      }
  }

  this.add = function(key, fn) {
      if (!this.functions[key]) this.functions[key] = [];
      this.functions[key].push(fn);
  }

  this.remove = function(key) {
      delete this.functions[key]
  }
}

/*////////////////////////////////////
SplitText
////////////////////////////////////*/

/*!
 * VERSION: 0.5.6
 * DATE: 2017-01-17
 * UPDATES AND DOCS AT: http://greensock.com
 *
 * @license Copyright (c) 2008-2017, GreenSock. All rights reserved.
 * SplitText is a Club GreenSock membership benefit; You must have a valid membership to use
 * this code without violating the terms of use. Visit http://greensock.com/club/ to sign up or get more details.
 * This work is subject to the software agreement that was issued with your membership.
 * 
 * @author: Jack Doyle, jack@greensock.com
 */
var _gsScope = (typeof(module) !== "undefined" && module.exports && typeof(global) !== "undefined") ? global : this || window; //helps ensure compatibility with AMD/RequireJS and CommonJS/Node
(function(window) {
	
	"use strict";
	var _globals = window.GreenSockGlobals || window,
		_namespace = function(ns) {
			var a = ns.split("."),
				p = _globals, i;
			for (i = 0; i < a.length; i++) {
				p[a[i]] = p = p[a[i]] || {};
			}
			return p;
		},
		pkg = _namespace("com.greensock.utils"),
		_getText = function(e) {
			var type = e.nodeType,
				result = "";
			if (type === 1 || type === 9 || type === 11) {
				if (typeof(e.textContent) === "string") {
					return e.textContent;
				} else {
					for ( e = e.firstChild; e; e = e.nextSibling ) {
						result += _getText(e);
					}
				}
			} else if (type === 3 || type === 4) {
				return e.nodeValue;
			}
			return result;
		},
		_doc = document,
		_getComputedStyle = _doc.defaultView ? _doc.defaultView.getComputedStyle : function() {},
		_capsExp = /([A-Z])/g,
		_getStyle = function(t, p, cs, str) {
			var result;
			if ((cs = cs || _getComputedStyle(t, null))) {
				t = cs.getPropertyValue(p.replace(_capsExp, "-$1").toLowerCase());
				result = (t || cs.length) ? t : cs[p]; //Opera behaves VERY strangely - length is usually 0 and cs[p] is the only way to get accurate results EXCEPT when checking for -o-transform which only works with cs.getPropertyValue()!
			} else if (t.currentStyle) {
				cs = t.currentStyle;
				result = cs[p];
			}
			return str ? result : parseInt(result, 10) || 0;
		},
		_isArrayLike = function(e) {
			return (e.length && e[0] && ((e[0].nodeType && e[0].style && !e.nodeType) || (e[0].length && e[0][0]))) ? true : false; //could be an array of jQuery objects too, so accommodate that.
		},
		_flattenArray = function(a) {
			var result = [],
				l = a.length,
				i, e, j;
			for (i = 0; i < l; i++) {
				e = a[i];
				if (_isArrayLike(e)) {
					j = e.length;
					for (j = 0; j < e.length; j++) {
						result.push(e[j]);
					}
				} else {
					result.push(e);
				}
			}
			return result;
		},
		_stripExp = /(?:\r|\n|\t\t)/g, //find carriage returns, new line feeds and double-tabs.
		_multipleSpacesExp = /(?:\s\s+)/g,
		_emojiStart = 0xD800,
		_emojiEnd = 0xDBFF,
		_emojiLowStart = 0xDC00,
		_emojiRegionStart = 0x1F1E6,
		_emojiRegionEnd = 0x1F1FF,
		_emojiModStart = 0x1f3fb,
		_emojiModEnd = 0x1f3ff,
		_emojiPairCode = function(s) {
			return ((s.charCodeAt(0) - _emojiStart) << 10) + (s.charCodeAt(1) - _emojiLowStart) + 0x10000;
		},
		_isOldIE = (_doc.all && !_doc.addEventListener),
		_divStart = " style='position:relative;display:inline-block;" + (_isOldIE ? "*display:inline;*zoom:1;'" : "'"), //note: we must use both display:inline-block and *display:inline for IE8 and earlier, otherwise it won't flow correctly (and if we only use display:inline, IE won't render most of the property tweens - very odd).
		_cssClassFunc = function(cssClass, tag) {
			cssClass = cssClass || "";
			var iterate = (cssClass.indexOf("++") !== -1),
				num = 1;
			if (iterate) {
				cssClass = cssClass.split("++").join("");
			}
			return function() {
				return "<" + tag + _divStart + (cssClass ? " class='" + cssClass + (iterate ? num++ : "") + "'>" : ">");
			};
		},
		SplitText = pkg.SplitText = _globals.SplitText = function(element, vars) {
			if (typeof(element) === "string") {
				element = SplitText.selector(element);
			}
			if (!element) {
				throw("cannot split a null element.");
			}
			this.elements = _isArrayLike(element) ? _flattenArray(element) : [element];
			this.chars = [];
			this.words = [];
			this.lines = [];
			this._originals = [];
			this.vars = vars || {};
			this.split(vars);
		},
		_swapText = function(element, oldText, newText) {
			var type = element.nodeType;
			if (type === 1 || type === 9 || type === 11) {
				for (element = element.firstChild; element; element = element.nextSibling) {
					_swapText(element, oldText, newText);
				}
			} else if (type === 3 || type === 4) {
				element.nodeValue = element.nodeValue.split(oldText).join(newText);
			}
		},
		_pushReversed = function(a, merge) {
			var i = merge.length;
			while (--i > -1) {
				a.push(merge[i]);
			}
		},
		_slice = function(a) { //don't use Array.prototype.slice.call(target, 0) because that doesn't work in IE8 with a NodeList that's returned by querySelectorAll()
			var b = [],
				l = a.length,
				i;
			for (i = 0; i !== l; b.push(a[i++])) {}
			return b;
		},
		_isBeforeWordDelimiter = function(e, root, wordDelimiter) {
			var next;
			while (e && e !== root) {
				next = e._next || e.nextSibling;
				if (next) {
					return next.textContent.charAt(0) === wordDelimiter;
				}
				e = e.parentNode || e._parent;
			}
			return false;
		},
		_deWordify = function(e) {
			var children = _slice(e.childNodes),
				l = children.length,
				i, child;
			for (i = 0; i < l; i++) {
				child = children[i];
				if (child._isSplit) {
					_deWordify(child);
				} else {
					if (i && child.previousSibling.nodeType === 3) {
						child.previousSibling.nodeValue += (child.nodeType === 3) ? child.nodeValue : child.firstChild.nodeValue;
					} else if (child.nodeType !== 3) {
						e.insertBefore(child.firstChild, child);
					}
					e.removeChild(child);
				}
			}
		},
		_setPositionsAfterSplit = function(element, vars, allChars, allWords, allLines, origWidth, origHeight) {
			var cs = _getComputedStyle(element),
				paddingLeft = _getStyle(element, "paddingLeft", cs),
				lineOffsetY = -999,
				borderTopAndBottom = _getStyle(element, "borderBottomWidth", cs) + _getStyle(element, "borderTopWidth", cs),
				borderLeftAndRight = _getStyle(element, "borderLeftWidth", cs) + _getStyle(element, "borderRightWidth", cs),
				padTopAndBottom = _getStyle(element, "paddingTop", cs) + _getStyle(element, "paddingBottom", cs),
				padLeftAndRight = _getStyle(element, "paddingLeft", cs) + _getStyle(element, "paddingRight", cs),
				lineThreshold = _getStyle(element, "fontSize") * 0.2,
				textAlign = _getStyle(element, "textAlign", cs, true),
				charArray = [],
				wordArray = [],
				lineArray = [],
				wordDelimiter = vars.wordDelimiter || " ",
				tag = vars.span ? "span" : "div",
				types = vars.type || vars.split || "chars,words,lines",
				lines = (allLines && types.indexOf("lines") !== -1) ? [] : null,
				words = (types.indexOf("words") !== -1),
				chars = (types.indexOf("chars") !== -1),
				absolute = (vars.position === "absolute" || vars.absolute === true),
				linesClass = vars.linesClass,
				iterateLine = ((linesClass || "").indexOf("++") !== -1),
				spaceNodesToRemove = [],
				i, j, l, node, nodes, isChild, curLine, addWordSpaces, style, lineNode, lineWidth, offset;
			if (lines && element.children.length === 1 && element.children[0]._isSplit) { //lines are always split on the main element (not inside nested elements), so if there's only one child, bust apart lines inside that rather than forcing it all into one big line. Like <div><div>lots of stuff</div></div> - if they split the outer one, it'd all be in one line.
				element = element.children[0];
			}
			if (iterateLine) {
				linesClass = linesClass.split("++").join("");
			}

			//copy all the descendant nodes into an array (we can't use a regular nodeList because it's live and we may need to renest things)
			j = element.getElementsByTagName("*");
			l = j.length;
			nodes = [];
			for (i = 0; i < l; i++) {
				nodes[i] = j[i];
			}

			//for absolute positioning, we need to record the x/y offsets and width/height for every <div>. And even if we're not positioning things absolutely, in order to accommodate lines, we must figure out where the y offset changes so that we can sense where the lines break, and we populate the lines array.
			if (lines || absolute) {
				for (i = 0; i < l; i++) {
					node = nodes[i];
					isChild = (node.parentNode === element);
					if (isChild || absolute || (chars && !words)) {
						offset = node.offsetTop;
						if (lines && isChild && Math.abs(offset - lineOffsetY) > lineThreshold && node.nodeName !== "BR") { //we found some rare occasions where a certain character like &#8209; could cause the offsetTop to be off by 1 pixel, so we build in a threshold.
							curLine = [];
							lines.push(curLine);
							lineOffsetY = offset;
						}
						if (absolute) { //record offset x and y, as well as width and height so that we can access them later for positioning. Grabbing them at once ensures we don't trigger a browser paint & we maximize performance.
							node._x = node.offsetLeft;
							node._y = offset;
							node._w = node.offsetWidth;
							node._h = node.offsetHeight;
						}
						if (lines) {
							if ((node._isSplit && isChild) || (!chars && isChild) || (words && isChild) || (!words && node.parentNode.parentNode === element && !node.parentNode._isSplit)) {
								curLine.push(node);
								node._x -= paddingLeft;
								if (_isBeforeWordDelimiter(node, element, wordDelimiter)) {
									node._wordEnd = true;
								}
							}
							if (node.nodeName === "BR" && node.nextSibling && node.nextSibling.nodeName === "BR") { //two consecutive <br> tags signify a new [empty] line.
								lines.push([]);
							}
						}
					}
				}
			}

			for (i = 0; i < l; i++) {
				node = nodes[i];
				isChild = (node.parentNode === element);
				if (node.nodeName === "BR") {
					if (lines || absolute) {
						if (node.parentNode) {
							node.parentNode.removeChild(node);
						}
						nodes.splice(i--, 1);
						l--;
					} else if (!words) {
						element.appendChild(node);
					}
					continue;
				}

				if (absolute) {
					style = node.style;
					if (!words && !isChild) {
						node._x += node.parentNode._x;
						node._y += node.parentNode._y;
					}
					style.left = node._x + "px";
					style.top = node._y + "px";
					style.position = "absolute";
					style.display = "block";
					//if we don't set the width/height, things collapse in older versions of IE and the origin for transforms is thrown off in all browsers.
					style.width = (node._w + 1) + "px"; //IE is 1px short sometimes. Avoid wrapping
					style.height = node._h + "px";
				}

				if (!words && chars) {
					//we always start out wrapping words in their own <div> so that line breaks happen correctly, but here we'll remove those <div> tags if necessary and renest the characters directly into the element rather than inside the word <div>
					if (node._isSplit) {
						node._next = node.nextSibling;
						node.parentNode.appendChild(node); //put it at the end to keep the order correct.

					} else if (node.parentNode._isSplit) {
						node._parent = node.parentNode;
						if (!node.previousSibling && node.firstChild) {
							node.firstChild._isFirst = true;
						}
						if (node.nextSibling && node.nextSibling.textContent === " " && !node.nextSibling.nextSibling) { //if the last node inside a nested element is just a space (like T<span>nested </span>), remove it otherwise it'll get placed in the wrong order. Don't remove it right away, though, because we need to sense when words/characters are before a space like _isBeforeWordDelimiter(). Removing it now would make that a false negative.
							spaceNodesToRemove.push(node.nextSibling);
						}
						node._next = (node.nextSibling && node.nextSibling._isFirst) ? null : node.nextSibling;
						node.parentNode.removeChild(node);
						nodes.splice(i--, 1);
						l--;
					} else if (!isChild) {
						offset = (!node.nextSibling && _isBeforeWordDelimiter(node.parentNode, element, wordDelimiter)); //if this is the last letter in the word (and we're not breaking by lines and not positioning things absolutely), we need to add a space afterwards so that the characters don't just mash together
						if (node.parentNode._parent) {
							node.parentNode._parent.appendChild(node);
						}
						if (offset) {
							node.parentNode.appendChild(_doc.createTextNode(" "));
						}
						if (vars.span) {
							node.style.display = "inline"; //so that word breaks are honored properly.
						}
						charArray.push(node);
					}
				} else if (node.parentNode._isSplit && !node._isSplit && node.innerHTML !== "") {
					wordArray.push(node);
				} else if (chars && !node._isSplit) {
					if (vars.span) {
						node.style.display = "inline";
					}
					charArray.push(node);
				}
			}

			i = spaceNodesToRemove.length;
			while (--i > -1) {
				spaceNodesToRemove[i].parentNode.removeChild(spaceNodesToRemove[i]);
			}

			if (lines) {
				//the next 7 lines just give us the line width in the most reliable way and figure out the left offset (if position isn't relative or absolute). We must set the width along with text-align to ensure everything works properly for various alignments.
				if (absolute) {
					lineNode = _doc.createElement(tag);
					element.appendChild(lineNode);
					lineWidth = lineNode.offsetWidth + "px";
					offset = (lineNode.offsetParent === element) ? 0 : element.offsetLeft;
					element.removeChild(lineNode);
				}
				style = element.style.cssText;
				element.style.cssText = "display:none;"; //to improve performance, set display:none on the element so that the browser doesn't have to worry about reflowing or rendering while we're renesting things. We'll revert the cssText later.
				//we can't use element.innerHTML = "" because that causes IE to literally delete all the nodes and their content even though we've stored them in an array! So we must loop through the children and remove them.
				while (element.firstChild) {
					element.removeChild(element.firstChild);
				}
				addWordSpaces = (wordDelimiter === " " && (!absolute || (!words && !chars)));
				for (i = 0; i < lines.length; i++) {
					curLine = lines[i];
					lineNode = _doc.createElement(tag);
					lineNode.style.cssText = "display:block;text-align:" + textAlign + ";position:" + (absolute ? "absolute;" : "relative;");
					if (linesClass) {
						lineNode.className = linesClass + (iterateLine ? i+1 : "");
					}
					lineArray.push(lineNode);
					l = curLine.length;
					for (j = 0; j < l; j++) {
						if (curLine[j].nodeName !== "BR") {
							node = curLine[j];
							lineNode.appendChild(node);
							if (addWordSpaces && node._wordEnd) {
								lineNode.appendChild(_doc.createTextNode(" "));
							}
							if (absolute) {
								if (j === 0) {
									lineNode.style.top = (node._y) + "px";
									lineNode.style.left = (paddingLeft + offset) + "px";
								}
								node.style.top = "0px";
								if (offset) {
									node.style.left = (node._x - offset) + "px";
								}
							}
						}
					}
					if (l === 0) { //if there are no nodes in the line (typically meaning there were two consecutive <br> tags, just add a non-breaking space so that things display properly.
						lineNode.innerHTML = "&nbsp;";
					} else if (!words && !chars) {
						_deWordify(lineNode);
						_swapText(lineNode, String.fromCharCode(160), " ");
					}
					if (absolute) {
						lineNode.style.width = lineWidth;
						lineNode.style.height = node._h + "px";
					}
					element.appendChild(lineNode);
				}
				element.style.cssText = style;
			}

			//if everything shifts to being position:absolute, the container can collapse in terms of height or width, so fix that here.
			if (absolute) {
				if (origHeight > element.clientHeight) {
					element.style.height = (origHeight - padTopAndBottom) + "px";
					if (element.clientHeight < origHeight) { //IE8 and earlier use a different box model - we must include padding and borders
						element.style.height = (origHeight + borderTopAndBottom)+ "px";
					}
				}
				if (origWidth > element.clientWidth) {
					element.style.width = (origWidth - padLeftAndRight) + "px";
					if (element.clientWidth < origWidth) { //IE8 and earlier use a different box model - we must include padding and borders
						element.style.width = (origWidth + borderLeftAndRight)+ "px";
					}
				}
			}
			_pushReversed(allChars, charArray);
			_pushReversed(allWords, wordArray);
			_pushReversed(allLines, lineArray);
		},
		_splitRawText = function(element, vars, wordStart, charStart) {
			var tag = vars.span ? "span" : "div",
				types = vars.type || vars.split || "chars,words,lines",
				words = (types.indexOf("words") !== -1),
				chars = (types.indexOf("chars") !== -1),
				absolute = (vars.position === "absolute" || vars.absolute === true),
				wordDelimiter = vars.wordDelimiter || " ",
				space = wordDelimiter !== " " ? "" : (absolute ? "&#173; " : " "),
				wordEnd = vars.span ? "</span>" : "</div>",
				wordIsOpen = true,
				text, splitText, i, j, l, character, hasTagStart, emojiPair1, emojiPair2,
				container = _doc.createElement("div"),
				parent = element.parentNode;

			parent.insertBefore(container, element);
			container.textContent = element.nodeValue;
			parent.removeChild(element);
			element = container;
			text = _getText(element);
			hasTagStart = text.indexOf("<") !== -1;

			if (vars.reduceWhiteSpace !== false) {
				text = text.replace(_multipleSpacesExp, " ").replace(_stripExp, "");
			}
			if (hasTagStart) {
				text = text.split("<").join("{{LT}}"); //we can't leave "<" in the string, or when we set the innerHTML, it can be interpreted as a node
			}
			l = text.length;
			splitText = ((text.charAt(0) === " ") ? space : "") + wordStart();
			for (i = 0; i < l; i++) {
				character = text.charAt(i);
				if (character === wordDelimiter && text.charAt(i-1) !== wordDelimiter && i) {
					splitText += wordIsOpen ? wordEnd : "";
					wordIsOpen = false;
					while (text.charAt(i + 1) === wordDelimiter) { //skip over empty spaces (to avoid making them words)
						splitText += space;
						i++;
					}
					if (i === l-1) {
						splitText += space;
					} else if (text.charAt(i + 1) !== ")") {
						splitText += space + wordStart();
						wordIsOpen = true;
					}

				} else if (character === "{" && text.substr(i, 6) === "{{LT}}") {
					splitText += chars ? charStart() + "{{LT}}" + "</" + tag + ">" : "{{LT}}";
					i += 5;

				} else if ((character.charCodeAt(0) >= _emojiStart && character.charCodeAt(0) <= _emojiEnd) || (text.charCodeAt(i+1) >= 0xFE00 && text.charCodeAt(i+1) <= 0xFE0F)) { //special emoji characters use 2 or 4 unicode characters that we must keep together.
					emojiPair1 = _emojiPairCode(text.substr(i, 2));
					emojiPair2 = _emojiPairCode(text.substr(i + 2, 2));
					j = ((emojiPair1 >= _emojiRegionStart && emojiPair1 <= _emojiRegionEnd && emojiPair2 >= _emojiRegionStart && emojiPair2 <= _emojiRegionEnd) || (emojiPair2 >= _emojiModStart && emojiPair2 <= _emojiModEnd)) ? 4 : 2;
					splitText += (chars && character !== " ") ? charStart() + text.substr(i, j) + "</" + tag + ">" : text.substr(i, j);
					i += j - 1;
				} else {
					splitText += (chars && character !== " ") ? charStart() + character + "</" + tag + ">" : character;
				}
			}
			element.outerHTML = splitText + (wordIsOpen ? wordEnd : "");
			if (hasTagStart) {
				_swapText(parent, "{{LT}}", "<"); //note: don't perform this on "element" because that gets replaced with all new elements when we set element.outerHTML.
			}
		},
		_split = function(element, vars, wordStart, charStart) {
			var children = _slice(element.childNodes),
				l = children.length,
				absolute = (vars.position === "absolute" || vars.absolute === true),
				i, child;

			if (element.nodeType !== 3 || l > 1) {
				vars.absolute = false;
				for (i = 0; i < l; i++) {
					child = children[i];
					if (child.nodeType !== 3 || /\S+/.test(child.nodeValue)) {
						if (absolute && child.nodeType !== 3 && _getStyle(child, "display", null, true) === "inline") { //if there's a child node that's display:inline, switch it to inline-block so that absolute positioning works properly (most browsers don't report offsetTop/offsetLeft properly inside a <span> for example)
							child.style.display = "inline-block";
							child.style.position = "relative";
						}
						child._isSplit = true;
						_split(child, vars, wordStart, charStart); //don't split lines on child elements
					}
				}
				vars.absolute = absolute;
				element._isSplit = true;
				return;
			}

			_splitRawText(element, vars, wordStart, charStart);

		},
		p = SplitText.prototype;

	p.split = function(vars) {
		if (this.isSplit) {
			this.revert();
		}
		this.vars = vars = vars || this.vars;
		this._originals.length = this.chars.length = this.words.length = this.lines.length = 0;
		var i = this.elements.length,
			tag = vars.span ? "span" : "div",
			absolute = (vars.position === "absolute" || vars.absolute === true),
			wordStart = _cssClassFunc(vars.wordsClass, tag),
			charStart = _cssClassFunc(vars.charsClass, tag),
			origHeight, origWidth, e;
		//we split in reversed order so that if/when we position:absolute elements, they don't affect the position of the ones after them in the document flow (shifting them up as they're taken out of the document flow).
		while (--i > -1) {
			e = this.elements[i];
			this._originals[i] = e.innerHTML;
			origHeight = e.clientHeight;
			origWidth = e.clientWidth;
			_split(e, vars, wordStart, charStart);
			_setPositionsAfterSplit(e, vars, this.chars, this.words, this.lines, origWidth, origHeight);
		}
		this.chars.reverse();
		this.words.reverse();
		this.lines.reverse();
		this.isSplit = true;
		return this;
	};

	p.revert = function() {
		if (!this._originals) {
			throw("revert() call wasn't scoped properly.");
		}
		var i = this._originals.length;
		while (--i > -1) {
			this.elements[i].innerHTML = this._originals[i];
		}
		this.chars = [];
		this.words = [];
		this.lines = [];
		this.isSplit = false;
		return this;
	};

	SplitText.selector = window.$ || window.jQuery || function(e) {
		var selector = window.$ || window.jQuery;
		if (selector) {
			SplitText.selector = selector;
			return selector(e);
		}
		return (typeof(document) === "undefined") ? e : (document.querySelectorAll ? document.querySelectorAll(e) : document.getElementById((e.charAt(0) === "#") ? e.substr(1) : e));
	};
	SplitText.version = "0.5.6";
	
})(_gsScope);

//export to AMD/RequireJS and CommonJS/Node (precursor to full modular build system coming at a later date)
(function(name) {
	"use strict";
	var getGlobal = function() {
		return (_gsScope.GreenSockGlobals || _gsScope)[name];
	};
	if (typeof(define) === "function" && define.amd) { //AMD
		define([], getGlobal);
	} else if (typeof(module) !== "undefined" && module.exports) { //node
		module.exports = getGlobal();
	}
}("SplitText"));

/*////////////////////////////////////
TweenMax
////////////////////////////////////*/

/*!
 * VERSION: 1.19.1
 * DATE: 2017-01-17
 * UPDATES AND DOCS AT: http://greensock.com
 * 
 * Includes all of the following: TweenLite, TweenMax, TimelineLite, TimelineMax, EasePack, CSSPlugin, RoundPropsPlugin, BezierPlugin, AttrPlugin, DirectionalRotationPlugin
 *
 * @license Copyright (c) 2008-2017, GreenSock. All rights reserved.
 * This work is subject to the terms at http://greensock.com/standard-license or for
 * Club GreenSock members, the software agreement that was issued with your membership.
 * 
 * @author: Jack Doyle, jack@greensock.com
 **/
var _gsScope = (typeof(module) !== "undefined" && module.exports && typeof(global) !== "undefined") ? global : this || window; //helps ensure compatibility with AMD/RequireJS and CommonJS/Node
(_gsScope._gsQueue || (_gsScope._gsQueue = [])).push( function() {

	"use strict";

	_gsScope._gsDefine("TweenMax", ["core.Animation","core.SimpleTimeline","TweenLite"], function(Animation, SimpleTimeline, TweenLite) {

		var _slice = function(a) { //don't use [].slice because that doesn't work in IE8 with a NodeList that's returned by querySelectorAll()
				var b = [],
					l = a.length,
					i;
				for (i = 0; i !== l; b.push(a[i++]));
				return b;
			},
			_applyCycle = function(vars, targets, i) {
				var alt = vars.cycle,
					p, val;
				for (p in alt) {
					val = alt[p];
					vars[p] = (typeof(val) === "function") ? val(i, targets[i]) : val[i % val.length];
				}
				delete vars.cycle;
			},
			TweenMax = function(target, duration, vars) {
				TweenLite.call(this, target, duration, vars);
				this._cycle = 0;
				this._yoyo = (this.vars.yoyo === true);
				this._repeat = this.vars.repeat || 0;
				this._repeatDelay = this.vars.repeatDelay || 0;
				this._dirty = true; //ensures that if there is any repeat, the totalDuration will get recalculated to accurately report it.
				this.render = TweenMax.prototype.render; //speed optimization (avoid prototype lookup on this "hot" method)
			},
			_tinyNum = 0.0000000001,
			TweenLiteInternals = TweenLite._internals,
			_isSelector = TweenLiteInternals.isSelector,
			_isArray = TweenLiteInternals.isArray,
			p = TweenMax.prototype = TweenLite.to({}, 0.1, {}),
			_blankArray = [];

		TweenMax.version = "1.19.1";
		p.constructor = TweenMax;
		p.kill()._gc = false;
		TweenMax.killTweensOf = TweenMax.killDelayedCallsTo = TweenLite.killTweensOf;
		TweenMax.getTweensOf = TweenLite.getTweensOf;
		TweenMax.lagSmoothing = TweenLite.lagSmoothing;
		TweenMax.ticker = TweenLite.ticker;
		TweenMax.render = TweenLite.render;

		p.invalidate = function() {
			this._yoyo = (this.vars.yoyo === true);
			this._repeat = this.vars.repeat || 0;
			this._repeatDelay = this.vars.repeatDelay || 0;
			this._uncache(true);
			return TweenLite.prototype.invalidate.call(this);
		};
		
		p.updateTo = function(vars, resetDuration) {
			var curRatio = this.ratio,
				immediate = this.vars.immediateRender || vars.immediateRender,
				p;
			if (resetDuration && this._startTime < this._timeline._time) {
				this._startTime = this._timeline._time;
				this._uncache(false);
				if (this._gc) {
					this._enabled(true, false);
				} else {
					this._timeline.insert(this, this._startTime - this._delay); //ensures that any necessary re-sequencing of Animations in the timeline occurs to make sure the rendering order is correct.
				}
			}
			for (p in vars) {
				this.vars[p] = vars[p];
			}
			if (this._initted || immediate) {
				if (resetDuration) {
					this._initted = false;
					if (immediate) {
						this.render(0, true, true);
					}
				} else {
					if (this._gc) {
						this._enabled(true, false);
					}
					if (this._notifyPluginsOfEnabled && this._firstPT) {
						TweenLite._onPluginEvent("_onDisable", this); //in case a plugin like MotionBlur must perform some cleanup tasks
					}
					if (this._time / this._duration > 0.998) { //if the tween has finished (or come extremely close to finishing), we just need to rewind it to 0 and then render it again at the end which forces it to re-initialize (parsing the new vars). We allow tweens that are close to finishing (but haven't quite finished) to work this way too because otherwise, the values are so small when determining where to project the starting values that binary math issues creep in and can make the tween appear to render incorrectly when run backwards. 
						var prevTime = this._totalTime;
						this.render(0, true, false);
						this._initted = false;
						this.render(prevTime, true, false);
					} else {
						this._initted = false;
						this._init();
						if (this._time > 0 || immediate) {
							var inv = 1 / (1 - curRatio),
								pt = this._firstPT, endValue;
							while (pt) {
								endValue = pt.s + pt.c;
								pt.c *= inv;
								pt.s = endValue - pt.c;
								pt = pt._next;
							}
						}
					}
				}
			}
			return this;
		};
				
		p.render = function(time, suppressEvents, force) {
			if (!this._initted) if (this._duration === 0 && this.vars.repeat) { //zero duration tweens that render immediately have render() called from TweenLite's constructor, before TweenMax's constructor has finished setting _repeat, _repeatDelay, and _yoyo which are critical in determining totalDuration() so we need to call invalidate() which is a low-kb way to get those set properly.
				this.invalidate();
			}
			var totalDur = (!this._dirty) ? this._totalDuration : this.totalDuration(),
				prevTime = this._time,
				prevTotalTime = this._totalTime, 
				prevCycle = this._cycle,
				duration = this._duration,
				prevRawPrevTime = this._rawPrevTime,
				isComplete, callback, pt, cycleDuration, r, type, pow, rawPrevTime;
			if (time >= totalDur - 0.0000001 && time >= 0) { //to work around occasional floating point math artifacts.
				this._totalTime = totalDur;
				this._cycle = this._repeat;
				if (this._yoyo && (this._cycle & 1) !== 0) {
					this._time = 0;
					this.ratio = this._ease._calcEnd ? this._ease.getRatio(0) : 0;
				} else {
					this._time = duration;
					this.ratio = this._ease._calcEnd ? this._ease.getRatio(1) : 1;
				}
				if (!this._reversed) {
					isComplete = true;
					callback = "onComplete";
					force = (force || this._timeline.autoRemoveChildren); //otherwise, if the animation is unpaused/activated after it's already finished, it doesn't get removed from the parent timeline.
				}
				if (duration === 0) if (this._initted || !this.vars.lazy || force) { //zero-duration tweens are tricky because we must discern the momentum/direction of time in order to determine whether the starting values should be rendered or the ending values. If the "playhead" of its timeline goes past the zero-duration tween in the forward direction or lands directly on it, the end values should be rendered, but if the timeline's "playhead" moves past it in the backward direction (from a postitive time to a negative time), the starting values must be rendered.
					if (this._startTime === this._timeline._duration) { //if a zero-duration tween is at the VERY end of a timeline and that timeline renders at its end, it will typically add a tiny bit of cushion to the render time to prevent rounding errors from getting in the way of tweens rendering their VERY end. If we then reverse() that timeline, the zero-duration tween will trigger its onReverseComplete even though technically the playhead didn't pass over it again. It's a very specific edge case we must accommodate.
						time = 0;
					}
					if (prevRawPrevTime < 0 || (time <= 0 && time >= -0.0000001) || (prevRawPrevTime === _tinyNum && this.data !== "isPause")) if (prevRawPrevTime !== time) { //note: when this.data is "isPause", it's a callback added by addPause() on a timeline that we should not be triggered when LEAVING its exact start time. In other words, tl.addPause(1).play(1) shouldn't pause.
						force = true;
						if (prevRawPrevTime > _tinyNum) {
							callback = "onReverseComplete";
						}
					}
					this._rawPrevTime = rawPrevTime = (!suppressEvents || time || prevRawPrevTime === time) ? time : _tinyNum; //when the playhead arrives at EXACTLY time 0 (right on top) of a zero-duration tween, we need to discern if events are suppressed so that when the playhead moves again (next time), it'll trigger the callback. If events are NOT suppressed, obviously the callback would be triggered in this render. Basically, the callback should fire either when the playhead ARRIVES or LEAVES this exact spot, not both. Imagine doing a timeline.seek(0) and there's a callback that sits at 0. Since events are suppressed on that seek() by default, nothing will fire, but when the playhead moves off of that position, the callback should fire. This behavior is what people intuitively expect. We set the _rawPrevTime to be a precise tiny number to indicate this scenario rather than using another property/variable which would increase memory usage. This technique is less readable, but more efficient.
				}
				
			} else if (time < 0.0000001) { //to work around occasional floating point math artifacts, round super small values to 0.
				this._totalTime = this._time = this._cycle = 0;
				this.ratio = this._ease._calcEnd ? this._ease.getRatio(0) : 0;
				if (prevTotalTime !== 0 || (duration === 0 && prevRawPrevTime > 0)) {
					callback = "onReverseComplete";
					isComplete = this._reversed;
				}
				if (time < 0) {
					this._active = false;
					if (duration === 0) if (this._initted || !this.vars.lazy || force) { //zero-duration tweens are tricky because we must discern the momentum/direction of time in order to determine whether the starting values should be rendered or the ending values. If the "playhead" of its timeline goes past the zero-duration tween in the forward direction or lands directly on it, the end values should be rendered, but if the timeline's "playhead" moves past it in the backward direction (from a postitive time to a negative time), the starting values must be rendered.
						if (prevRawPrevTime >= 0) {
							force = true;
						}
						this._rawPrevTime = rawPrevTime = (!suppressEvents || time || prevRawPrevTime === time) ? time : _tinyNum; //when the playhead arrives at EXACTLY time 0 (right on top) of a zero-duration tween, we need to discern if events are suppressed so that when the playhead moves again (next time), it'll trigger the callback. If events are NOT suppressed, obviously the callback would be triggered in this render. Basically, the callback should fire either when the playhead ARRIVES or LEAVES this exact spot, not both. Imagine doing a timeline.seek(0) and there's a callback that sits at 0. Since events are suppressed on that seek() by default, nothing will fire, but when the playhead moves off of that position, the callback should fire. This behavior is what people intuitively expect. We set the _rawPrevTime to be a precise tiny number to indicate this scenario rather than using another property/variable which would increase memory usage. This technique is less readable, but more efficient.
					}
				}
				if (!this._initted) { //if we render the very beginning (time == 0) of a fromTo(), we must force the render (normal tweens wouldn't need to render at a time of 0 when the prevTime was also 0). This is also mandatory to make sure overwriting kicks in immediately.
					force = true;
				}
			} else {
				this._totalTime = this._time = time;
				if (this._repeat !== 0) {
					cycleDuration = duration + this._repeatDelay;
					this._cycle = (this._totalTime / cycleDuration) >> 0; //originally _totalTime % cycleDuration but floating point errors caused problems, so I normalized it. (4 % 0.8 should be 0 but some browsers report it as 0.79999999!)
					if (this._cycle !== 0) if (this._cycle === this._totalTime / cycleDuration && prevTotalTime <= time) {
						this._cycle--; //otherwise when rendered exactly at the end time, it will act as though it is repeating (at the beginning)
					}
					this._time = this._totalTime - (this._cycle * cycleDuration);
					if (this._yoyo) if ((this._cycle & 1) !== 0) {
						this._time = duration - this._time;
					}
					if (this._time > duration) {
						this._time = duration;
					} else if (this._time < 0) {
						this._time = 0;
					}
				}

				if (this._easeType) {
					r = this._time / duration;
					type = this._easeType;
					pow = this._easePower;
					if (type === 1 || (type === 3 && r >= 0.5)) {
						r = 1 - r;
					}
					if (type === 3) {
						r *= 2;
					}
					if (pow === 1) {
						r *= r;
					} else if (pow === 2) {
						r *= r * r;
					} else if (pow === 3) {
						r *= r * r * r;
					} else if (pow === 4) {
						r *= r * r * r * r;
					}

					if (type === 1) {
						this.ratio = 1 - r;
					} else if (type === 2) {
						this.ratio = r;
					} else if (this._time / duration < 0.5) {
						this.ratio = r / 2;
					} else {
						this.ratio = 1 - (r / 2);
					}

				} else {
					this.ratio = this._ease.getRatio(this._time / duration);
				}
				
			}
				
			if (prevTime === this._time && !force && prevCycle === this._cycle) {
				if (prevTotalTime !== this._totalTime) if (this._onUpdate) if (!suppressEvents) { //so that onUpdate fires even during the repeatDelay - as long as the totalTime changed, we should trigger onUpdate.
					this._callback("onUpdate");
				}
				return;
			} else if (!this._initted) {
				this._init();
				if (!this._initted || this._gc) { //immediateRender tweens typically won't initialize until the playhead advances (_time is greater than 0) in order to ensure that overwriting occurs properly. Also, if all of the tweening properties have been overwritten (which would cause _gc to be true, as set in _init()), we shouldn't continue otherwise an onStart callback could be called for example.
					return;
				} else if (!force && this._firstPT && ((this.vars.lazy !== false && this._duration) || (this.vars.lazy && !this._duration))) { //we stick it in the queue for rendering at the very end of the tick - this is a performance optimization because browsers invalidate styles and force a recalculation if you read, write, and then read style data (so it's better to read/read/read/write/write/write than read/write/read/write/read/write). The down side, of course, is that usually you WANT things to render immediately because you may have code running right after that which depends on the change. Like imagine running TweenLite.set(...) and then immediately after that, creating a nother tween that animates the same property to another value; the starting values of that 2nd tween wouldn't be accurate if lazy is true.
					this._time = prevTime;
					this._totalTime = prevTotalTime;
					this._rawPrevTime = prevRawPrevTime;
					this._cycle = prevCycle;
					TweenLiteInternals.lazyTweens.push(this);
					this._lazy = [time, suppressEvents];
					return;
				}
				//_ease is initially set to defaultEase, so now that init() has run, _ease is set properly and we need to recalculate the ratio. Overall this is faster than using conditional logic earlier in the method to avoid having to set ratio twice because we only init() once but renderTime() gets called VERY frequently.
				if (this._time && !isComplete) {
					this.ratio = this._ease.getRatio(this._time / duration);
				} else if (isComplete && this._ease._calcEnd) {
					this.ratio = this._ease.getRatio((this._time === 0) ? 0 : 1);
				}
			}
			if (this._lazy !== false) {
				this._lazy = false;
			}

			if (!this._active) if (!this._paused && this._time !== prevTime && time >= 0) {
				this._active = true; //so that if the user renders a tween (as opposed to the timeline rendering it), the timeline is forced to re-render and align it with the proper time/frame on the next rendering cycle. Maybe the tween already finished but the user manually re-renders it as halfway done.
			}
			if (prevTotalTime === 0) {
				if (this._initted === 2 && time > 0) {
					//this.invalidate();
					this._init(); //will just apply overwriting since _initted of (2) means it was a from() tween that had immediateRender:true
				}
				if (this._startAt) {
					if (time >= 0) {
						this._startAt.render(time, suppressEvents, force);
					} else if (!callback) {
						callback = "_dummyGS"; //if no callback is defined, use a dummy value just so that the condition at the end evaluates as true because _startAt should render AFTER the normal render loop when the time is negative. We could handle this in a more intuitive way, of course, but the render loop is the MOST important thing to optimize, so this technique allows us to avoid adding extra conditional logic in a high-frequency area.
					}
				}
				if (this.vars.onStart) if (this._totalTime !== 0 || duration === 0) if (!suppressEvents) {
					this._callback("onStart");
				}
			}
			
			pt = this._firstPT;
			while (pt) {
				if (pt.f) {
					pt.t[pt.p](pt.c * this.ratio + pt.s);
				} else {
					pt.t[pt.p] = pt.c * this.ratio + pt.s;
				}
				pt = pt._next;
			}
			
			if (this._onUpdate) {
				if (time < 0) if (this._startAt && this._startTime) { //if the tween is positioned at the VERY beginning (_startTime 0) of its parent timeline, it's illegal for the playhead to go back further, so we should not render the recorded startAt values.
					this._startAt.render(time, suppressEvents, force); //note: for performance reasons, we tuck this conditional logic inside less traveled areas (most tweens don't have an onUpdate). We'd just have it at the end before the onComplete, but the values should be updated before any onUpdate is called, so we ALSO put it here and then if it's not called, we do so later near the onComplete.
				}
				if (!suppressEvents) if (this._totalTime !== prevTotalTime || callback) {
					this._callback("onUpdate");
				}
			}
			if (this._cycle !== prevCycle) if (!suppressEvents) if (!this._gc) if (this.vars.onRepeat) {
				this._callback("onRepeat");
			}
			if (callback) if (!this._gc || force) { //check gc because there's a chance that kill() could be called in an onUpdate
				if (time < 0 && this._startAt && !this._onUpdate && this._startTime) { //if the tween is positioned at the VERY beginning (_startTime 0) of its parent timeline, it's illegal for the playhead to go back further, so we should not render the recorded startAt values.
					this._startAt.render(time, suppressEvents, force);
				}
				if (isComplete) {
					if (this._timeline.autoRemoveChildren) {
						this._enabled(false, false);
					}
					this._active = false;
				}
				if (!suppressEvents && this.vars[callback]) {
					this._callback(callback);
				}
				if (duration === 0 && this._rawPrevTime === _tinyNum && rawPrevTime !== _tinyNum) { //the onComplete or onReverseComplete could trigger movement of the playhead and for zero-duration tweens (which must discern direction) that land directly back on their start time, we don't want to fire again on the next render. Think of several addPause()'s in a timeline that forces the playhead to a certain spot, but what if it's already paused and another tween is tweening the "time" of the timeline? Each time it moves [forward] past that spot, it would move back, and since suppressEvents is true, it'd reset _rawPrevTime to _tinyNum so that when it begins again, the callback would fire (so ultimately it could bounce back and forth during that tween). Again, this is a very uncommon scenario, but possible nonetheless.
					this._rawPrevTime = 0;
				}
			}
		};
		
//---- STATIC FUNCTIONS -----------------------------------------------------------------------------------------------------------
		
		TweenMax.to = function(target, duration, vars) {
			return new TweenMax(target, duration, vars);
		};
		
		TweenMax.from = function(target, duration, vars) {
			vars.runBackwards = true;
			vars.immediateRender = (vars.immediateRender != false);
			return new TweenMax(target, duration, vars);
		};
		
		TweenMax.fromTo = function(target, duration, fromVars, toVars) {
			toVars.startAt = fromVars;
			toVars.immediateRender = (toVars.immediateRender != false && fromVars.immediateRender != false);
			return new TweenMax(target, duration, toVars);
		};
		
		TweenMax.staggerTo = TweenMax.allTo = function(targets, duration, vars, stagger, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
			stagger = stagger || 0;
			var delay = 0,
				a = [],
				finalComplete = function() {
					if (vars.onComplete) {
						vars.onComplete.apply(vars.onCompleteScope || this, arguments);
					}
					onCompleteAll.apply(onCompleteAllScope || vars.callbackScope || this, onCompleteAllParams || _blankArray);
				},
				cycle = vars.cycle,
				fromCycle = (vars.startAt && vars.startAt.cycle),
				l, copy, i, p;
			if (!_isArray(targets)) {
				if (typeof(targets) === "string") {
					targets = TweenLite.selector(targets) || targets;
				}
				if (_isSelector(targets)) {
					targets = _slice(targets);
				}
			}
			targets = targets || [];
			if (stagger < 0) {
				targets = _slice(targets);
				targets.reverse();
				stagger *= -1;
			}
			l = targets.length - 1;
			for (i = 0; i <= l; i++) {
				copy = {};
				for (p in vars) {
					copy[p] = vars[p];
				}
				if (cycle) {
					_applyCycle(copy, targets, i);
					if (copy.duration != null) {
						duration = copy.duration;
						delete copy.duration;
					}
				}
				if (fromCycle) {
					fromCycle = copy.startAt = {};
					for (p in vars.startAt) {
						fromCycle[p] = vars.startAt[p];
					}
					_applyCycle(copy.startAt, targets, i);
				}
				copy.delay = delay + (copy.delay || 0);
				if (i === l && onCompleteAll) {
					copy.onComplete = finalComplete;
				}
				a[i] = new TweenMax(targets[i], duration, copy);
				delay += stagger;
			}
			return a;
		};
		
		TweenMax.staggerFrom = TweenMax.allFrom = function(targets, duration, vars, stagger, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
			vars.runBackwards = true;
			vars.immediateRender = (vars.immediateRender != false);
			return TweenMax.staggerTo(targets, duration, vars, stagger, onCompleteAll, onCompleteAllParams, onCompleteAllScope);
		};
		
		TweenMax.staggerFromTo = TweenMax.allFromTo = function(targets, duration, fromVars, toVars, stagger, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
			toVars.startAt = fromVars;
			toVars.immediateRender = (toVars.immediateRender != false && fromVars.immediateRender != false);
			return TweenMax.staggerTo(targets, duration, toVars, stagger, onCompleteAll, onCompleteAllParams, onCompleteAllScope);
		};
				
		TweenMax.delayedCall = function(delay, callback, params, scope, useFrames) {
			return new TweenMax(callback, 0, {delay:delay, onComplete:callback, onCompleteParams:params, callbackScope:scope, onReverseComplete:callback, onReverseCompleteParams:params, immediateRender:false, useFrames:useFrames, overwrite:0});
		};
		
		TweenMax.set = function(target, vars) {
			return new TweenMax(target, 0, vars);
		};
		
		TweenMax.isTweening = function(target) {
			return (TweenLite.getTweensOf(target, true).length > 0);
		};
		
		var _getChildrenOf = function(timeline, includeTimelines) {
				var a = [],
					cnt = 0,
					tween = timeline._first;
				while (tween) {
					if (tween instanceof TweenLite) {
						a[cnt++] = tween;
					} else {
						if (includeTimelines) {
							a[cnt++] = tween;
						}
						a = a.concat(_getChildrenOf(tween, includeTimelines));
						cnt = a.length;
					}
					tween = tween._next;
				}
				return a;
			}, 
			getAllTweens = TweenMax.getAllTweens = function(includeTimelines) {
				return _getChildrenOf(Animation._rootTimeline, includeTimelines).concat( _getChildrenOf(Animation._rootFramesTimeline, includeTimelines) );
			};
		
		TweenMax.killAll = function(complete, tweens, delayedCalls, timelines) {
			if (tweens == null) {
				tweens = true;
			}
			if (delayedCalls == null) {
				delayedCalls = true;
			}
			var a = getAllTweens((timelines != false)),
				l = a.length,
				allTrue = (tweens && delayedCalls && timelines),
				isDC, tween, i;
			for (i = 0; i < l; i++) {
				tween = a[i];
				if (allTrue || (tween instanceof SimpleTimeline) || ((isDC = (tween.target === tween.vars.onComplete)) && delayedCalls) || (tweens && !isDC)) {
					if (complete) {
						tween.totalTime(tween._reversed ? 0 : tween.totalDuration());
					} else {
						tween._enabled(false, false);
					}
				}
			}
		};
		
		TweenMax.killChildTweensOf = function(parent, complete) {
			if (parent == null) {
				return;
			}
			var tl = TweenLiteInternals.tweenLookup,
				a, curParent, p, i, l;
			if (typeof(parent) === "string") {
				parent = TweenLite.selector(parent) || parent;
			}
			if (_isSelector(parent)) {
				parent = _slice(parent);
			}
			if (_isArray(parent)) {
				i = parent.length;
				while (--i > -1) {
					TweenMax.killChildTweensOf(parent[i], complete);
				}
				return;
			}
			a = [];
			for (p in tl) {
				curParent = tl[p].target.parentNode;
				while (curParent) {
					if (curParent === parent) {
						a = a.concat(tl[p].tweens);
					}
					curParent = curParent.parentNode;
				}
			}
			l = a.length;
			for (i = 0; i < l; i++) {
				if (complete) {
					a[i].totalTime(a[i].totalDuration());
				}
				a[i]._enabled(false, false);
			}
		};

		var _changePause = function(pause, tweens, delayedCalls, timelines) {
			tweens = (tweens !== false);
			delayedCalls = (delayedCalls !== false);
			timelines = (timelines !== false);
			var a = getAllTweens(timelines),
				allTrue = (tweens && delayedCalls && timelines),
				i = a.length,
				isDC, tween;
			while (--i > -1) {
				tween = a[i];
				if (allTrue || (tween instanceof SimpleTimeline) || ((isDC = (tween.target === tween.vars.onComplete)) && delayedCalls) || (tweens && !isDC)) {
					tween.paused(pause);
				}
			}
		};
		
		TweenMax.pauseAll = function(tweens, delayedCalls, timelines) {
			_changePause(true, tweens, delayedCalls, timelines);
		};
		
		TweenMax.resumeAll = function(tweens, delayedCalls, timelines) {
			_changePause(false, tweens, delayedCalls, timelines);
		};

		TweenMax.globalTimeScale = function(value) {
			var tl = Animation._rootTimeline,
				t = TweenLite.ticker.time;
			if (!arguments.length) {
				return tl._timeScale;
			}
			value = value || _tinyNum; //can't allow zero because it'll throw the math off
			tl._startTime = t - ((t - tl._startTime) * tl._timeScale / value);
			tl = Animation._rootFramesTimeline;
			t = TweenLite.ticker.frame;
			tl._startTime = t - ((t - tl._startTime) * tl._timeScale / value);
			tl._timeScale = Animation._rootTimeline._timeScale = value;
			return value;
		};
		
	
//---- GETTERS / SETTERS ----------------------------------------------------------------------------------------------------------
		
		p.progress = function(value, suppressEvents) {
			return (!arguments.length) ? this._time / this.duration() : this.totalTime( this.duration() * ((this._yoyo && (this._cycle & 1) !== 0) ? 1 - value : value) + (this._cycle * (this._duration + this._repeatDelay)), suppressEvents);
		};
		
		p.totalProgress = function(value, suppressEvents) {
			return (!arguments.length) ? this._totalTime / this.totalDuration() : this.totalTime( this.totalDuration() * value, suppressEvents);
		};
		
		p.time = function(value, suppressEvents) {
			if (!arguments.length) {
				return this._time;
			}
			if (this._dirty) {
				this.totalDuration();
			}
			if (value > this._duration) {
				value = this._duration;
			}
			if (this._yoyo && (this._cycle & 1) !== 0) {
				value = (this._duration - value) + (this._cycle * (this._duration + this._repeatDelay));
			} else if (this._repeat !== 0) {
				value += this._cycle * (this._duration + this._repeatDelay);
			}
			return this.totalTime(value, suppressEvents);
		};

		p.duration = function(value) {
			if (!arguments.length) {
				return this._duration; //don't set _dirty = false because there could be repeats that haven't been factored into the _totalDuration yet. Otherwise, if you create a repeated TweenMax and then immediately check its duration(), it would cache the value and the totalDuration would not be correct, thus repeats wouldn't take effect.
			}
			return Animation.prototype.duration.call(this, value);
		};

		p.totalDuration = function(value) {
			if (!arguments.length) {
				if (this._dirty) {
					//instead of Infinity, we use 999999999999 so that we can accommodate reverses
					this._totalDuration = (this._repeat === -1) ? 999999999999 : this._duration * (this._repeat + 1) + (this._repeatDelay * this._repeat);
					this._dirty = false;
				}
				return this._totalDuration;
			}
			return (this._repeat === -1) ? this : this.duration( (value - (this._repeat * this._repeatDelay)) / (this._repeat + 1) );
		};
		
		p.repeat = function(value) {
			if (!arguments.length) {
				return this._repeat;
			}
			this._repeat = value;
			return this._uncache(true);
		};
		
		p.repeatDelay = function(value) {
			if (!arguments.length) {
				return this._repeatDelay;
			}
			this._repeatDelay = value;
			return this._uncache(true);
		};
		
		p.yoyo = function(value) {
			if (!arguments.length) {
				return this._yoyo;
			}
			this._yoyo = value;
			return this;
		};
		
		
		return TweenMax;
		
	}, true);








/*
 * ----------------------------------------------------------------
 * TimelineLite
 * ----------------------------------------------------------------
 */
	_gsScope._gsDefine("TimelineLite", ["core.Animation","core.SimpleTimeline","TweenLite"], function(Animation, SimpleTimeline, TweenLite) {

		var TimelineLite = function(vars) {
				SimpleTimeline.call(this, vars);
				this._labels = {};
				this.autoRemoveChildren = (this.vars.autoRemoveChildren === true);
				this.smoothChildTiming = (this.vars.smoothChildTiming === true);
				this._sortChildren = true;
				this._onUpdate = this.vars.onUpdate;
				var v = this.vars,
					val, p;
				for (p in v) {
					val = v[p];
					if (_isArray(val)) if (val.join("").indexOf("{self}") !== -1) {
						v[p] = this._swapSelfInParams(val);
					}
				}
				if (_isArray(v.tweens)) {
					this.add(v.tweens, 0, v.align, v.stagger);
				}
			},
			_tinyNum = 0.0000000001,
			TweenLiteInternals = TweenLite._internals,
			_internals = TimelineLite._internals = {},
			_isSelector = TweenLiteInternals.isSelector,
			_isArray = TweenLiteInternals.isArray,
			_lazyTweens = TweenLiteInternals.lazyTweens,
			_lazyRender = TweenLiteInternals.lazyRender,
			_globals = _gsScope._gsDefine.globals,
			_copy = function(vars) {
				var copy = {}, p;
				for (p in vars) {
					copy[p] = vars[p];
				}
				return copy;
			},
			_applyCycle = function(vars, targets, i) {
				var alt = vars.cycle,
					p, val;
				for (p in alt) {
					val = alt[p];
					vars[p] = (typeof(val) === "function") ? val(i, targets[i]) : val[i % val.length];
				}
				delete vars.cycle;
			},
			_pauseCallback = _internals.pauseCallback = function() {},
			_slice = function(a) { //don't use [].slice because that doesn't work in IE8 with a NodeList that's returned by querySelectorAll()
				var b = [],
					l = a.length,
					i;
				for (i = 0; i !== l; b.push(a[i++]));
				return b;
			},
			p = TimelineLite.prototype = new SimpleTimeline();

		TimelineLite.version = "1.19.1";
		p.constructor = TimelineLite;
		p.kill()._gc = p._forcingPlayhead = p._hasPause = false;

		/* might use later...
		//translates a local time inside an animation to the corresponding time on the root/global timeline, factoring in all nesting and timeScales.
		function localToGlobal(time, animation) {
			while (animation) {
				time = (time / animation._timeScale) + animation._startTime;
				animation = animation.timeline;
			}
			return time;
		}

		//translates the supplied time on the root/global timeline into the corresponding local time inside a particular animation, factoring in all nesting and timeScales
		function globalToLocal(time, animation) {
			var scale = 1;
			time -= localToGlobal(0, animation);
			while (animation) {
				scale *= animation._timeScale;
				animation = animation.timeline;
			}
			return time * scale;
		}
		*/

		p.to = function(target, duration, vars, position) {
			var Engine = (vars.repeat && _globals.TweenMax) || TweenLite;
			return duration ? this.add( new Engine(target, duration, vars), position) : this.set(target, vars, position);
		};

		p.from = function(target, duration, vars, position) {
			return this.add( ((vars.repeat && _globals.TweenMax) || TweenLite).from(target, duration, vars), position);
		};

		p.fromTo = function(target, duration, fromVars, toVars, position) {
			var Engine = (toVars.repeat && _globals.TweenMax) || TweenLite;
			return duration ? this.add( Engine.fromTo(target, duration, fromVars, toVars), position) : this.set(target, toVars, position);
		};

		p.staggerTo = function(targets, duration, vars, stagger, position, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
			var tl = new TimelineLite({onComplete:onCompleteAll, onCompleteParams:onCompleteAllParams, callbackScope:onCompleteAllScope, smoothChildTiming:this.smoothChildTiming}),
				cycle = vars.cycle,
				copy, i;
			if (typeof(targets) === "string") {
				targets = TweenLite.selector(targets) || targets;
			}
			targets = targets || [];
			if (_isSelector(targets)) { //senses if the targets object is a selector. If it is, we should translate it into an array.
				targets = _slice(targets);
			}
			stagger = stagger || 0;
			if (stagger < 0) {
				targets = _slice(targets);
				targets.reverse();
				stagger *= -1;
			}
			for (i = 0; i < targets.length; i++) {
				copy = _copy(vars);
				if (copy.startAt) {
					copy.startAt = _copy(copy.startAt);
					if (copy.startAt.cycle) {
						_applyCycle(copy.startAt, targets, i);
					}
				}
				if (cycle) {
					_applyCycle(copy, targets, i);
					if (copy.duration != null) {
						duration = copy.duration;
						delete copy.duration;
					}
				}
				tl.to(targets[i], duration, copy, i * stagger);
			}
			return this.add(tl, position);
		};

		p.staggerFrom = function(targets, duration, vars, stagger, position, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
			vars.immediateRender = (vars.immediateRender != false);
			vars.runBackwards = true;
			return this.staggerTo(targets, duration, vars, stagger, position, onCompleteAll, onCompleteAllParams, onCompleteAllScope);
		};

		p.staggerFromTo = function(targets, duration, fromVars, toVars, stagger, position, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
			toVars.startAt = fromVars;
			toVars.immediateRender = (toVars.immediateRender != false && fromVars.immediateRender != false);
			return this.staggerTo(targets, duration, toVars, stagger, position, onCompleteAll, onCompleteAllParams, onCompleteAllScope);
		};

		p.call = function(callback, params, scope, position) {
			return this.add( TweenLite.delayedCall(0, callback, params, scope), position);
		};

		p.set = function(target, vars, position) {
			position = this._parseTimeOrLabel(position, 0, true);
			if (vars.immediateRender == null) {
				vars.immediateRender = (position === this._time && !this._paused);
			}
			return this.add( new TweenLite(target, 0, vars), position);
		};

		TimelineLite.exportRoot = function(vars, ignoreDelayedCalls) {
			vars = vars || {};
			if (vars.smoothChildTiming == null) {
				vars.smoothChildTiming = true;
			}
			var tl = new TimelineLite(vars),
				root = tl._timeline,
				tween, next;
			if (ignoreDelayedCalls == null) {
				ignoreDelayedCalls = true;
			}
			root._remove(tl, true);
			tl._startTime = 0;
			tl._rawPrevTime = tl._time = tl._totalTime = root._time;
			tween = root._first;
			while (tween) {
				next = tween._next;
				if (!ignoreDelayedCalls || !(tween instanceof TweenLite && tween.target === tween.vars.onComplete)) {
					tl.add(tween, tween._startTime - tween._delay);
				}
				tween = next;
			}
			root.add(tl, 0);
			return tl;
		};

		p.add = function(value, position, align, stagger) {
			var curTime, l, i, child, tl, beforeRawTime;
			if (typeof(position) !== "number") {
				position = this._parseTimeOrLabel(position, 0, true, value);
			}
			if (!(value instanceof Animation)) {
				if ((value instanceof Array) || (value && value.push && _isArray(value))) {
					align = align || "normal";
					stagger = stagger || 0;
					curTime = position;
					l = value.length;
					for (i = 0; i < l; i++) {
						if (_isArray(child = value[i])) {
							child = new TimelineLite({tweens:child});
						}
						this.add(child, curTime);
						if (typeof(child) !== "string" && typeof(child) !== "function") {
							if (align === "sequence") {
								curTime = child._startTime + (child.totalDuration() / child._timeScale);
							} else if (align === "start") {
								child._startTime -= child.delay();
							}
						}
						curTime += stagger;
					}
					return this._uncache(true);
				} else if (typeof(value) === "string") {
					return this.addLabel(value, position);
				} else if (typeof(value) === "function") {
					value = TweenLite.delayedCall(0, value);
				} else {
					throw("Cannot add " + value + " into the timeline; it is not a tween, timeline, function, or string.");
				}
			}

			SimpleTimeline.prototype.add.call(this, value, position);

			//if the timeline has already ended but the inserted tween/timeline extends the duration, we should enable this timeline again so that it renders properly. We should also align the playhead with the parent timeline's when appropriate.
			if (this._gc || this._time === this._duration) if (!this._paused) if (this._duration < this.duration()) {
				//in case any of the ancestors had completed but should now be enabled...
				tl = this;
				beforeRawTime = (tl.rawTime() > value._startTime); //if the tween is placed on the timeline so that it starts BEFORE the current rawTime, we should align the playhead (move the timeline). This is because sometimes users will create a timeline, let it finish, and much later append a tween and expect it to run instead of jumping to its end state. While technically one could argue that it should jump to its end state, that's not what users intuitively expect.
				while (tl._timeline) {
					if (beforeRawTime && tl._timeline.smoothChildTiming) {
						tl.totalTime(tl._totalTime, true); //moves the timeline (shifts its startTime) if necessary, and also enables it.
					} else if (tl._gc) {
						tl._enabled(true, false);
					}
					tl = tl._timeline;
				}
			}

			return this;
		};

		p.remove = function(value) {
			if (value instanceof Animation) {
				this._remove(value, false);
				var tl = value._timeline = value.vars.useFrames ? Animation._rootFramesTimeline : Animation._rootTimeline; //now that it's removed, default it to the root timeline so that if it gets played again, it doesn't jump back into this timeline.
				value._startTime = (value._paused ? value._pauseTime : tl._time) - ((!value._reversed ? value._totalTime : value.totalDuration() - value._totalTime) / value._timeScale); //ensure that if it gets played again, the timing is correct.
				return this;
			} else if (value instanceof Array || (value && value.push && _isArray(value))) {
				var i = value.length;
				while (--i > -1) {
					this.remove(value[i]);
				}
				return this;
			} else if (typeof(value) === "string") {
				return this.removeLabel(value);
			}
			return this.kill(null, value);
		};

		p._remove = function(tween, skipDisable) {
			SimpleTimeline.prototype._remove.call(this, tween, skipDisable);
			var last = this._last;
			if (!last) {
				this._time = this._totalTime = this._duration = this._totalDuration = 0;
			} else if (this._time > this.duration()) {
				this._time = this._duration;
				this._totalTime = this._totalDuration;
			}
			return this;
		};

		p.append = function(value, offsetOrLabel) {
			return this.add(value, this._parseTimeOrLabel(null, offsetOrLabel, true, value));
		};

		p.insert = p.insertMultiple = function(value, position, align, stagger) {
			return this.add(value, position || 0, align, stagger);
		};

		p.appendMultiple = function(tweens, offsetOrLabel, align, stagger) {
			return this.add(tweens, this._parseTimeOrLabel(null, offsetOrLabel, true, tweens), align, stagger);
		};

		p.addLabel = function(label, position) {
			this._labels[label] = this._parseTimeOrLabel(position);
			return this;
		};

		p.addPause = function(position, callback, params, scope) {
			var t = TweenLite.delayedCall(0, _pauseCallback, params, scope || this);
			t.vars.onComplete = t.vars.onReverseComplete = callback;
			t.data = "isPause";
			this._hasPause = true;
			return this.add(t, position);
		};

		p.removeLabel = function(label) {
			delete this._labels[label];
			return this;
		};

		p.getLabelTime = function(label) {
			return (this._labels[label] != null) ? this._labels[label] : -1;
		};

		p._parseTimeOrLabel = function(timeOrLabel, offsetOrLabel, appendIfAbsent, ignore) {
			var i;
			//if we're about to add a tween/timeline (or an array of them) that's already a child of this timeline, we should remove it first so that it doesn't contaminate the duration().
			if (ignore instanceof Animation && ignore.timeline === this) {
				this.remove(ignore);
			} else if (ignore && ((ignore instanceof Array) || (ignore.push && _isArray(ignore)))) {
				i = ignore.length;
				while (--i > -1) {
					if (ignore[i] instanceof Animation && ignore[i].timeline === this) {
						this.remove(ignore[i]);
					}
				}
			}
			if (typeof(offsetOrLabel) === "string") {
				return this._parseTimeOrLabel(offsetOrLabel, (appendIfAbsent && typeof(timeOrLabel) === "number" && this._labels[offsetOrLabel] == null) ? timeOrLabel - this.duration() : 0, appendIfAbsent);
			}
			offsetOrLabel = offsetOrLabel || 0;
			if (typeof(timeOrLabel) === "string" && (isNaN(timeOrLabel) || this._labels[timeOrLabel] != null)) { //if the string is a number like "1", check to see if there's a label with that name, otherwise interpret it as a number (absolute value).
				i = timeOrLabel.indexOf("=");
				if (i === -1) {
					if (this._labels[timeOrLabel] == null) {
						return appendIfAbsent ? (this._labels[timeOrLabel] = this.duration() + offsetOrLabel) : offsetOrLabel;
					}
					return this._labels[timeOrLabel] + offsetOrLabel;
				}
				offsetOrLabel = parseInt(timeOrLabel.charAt(i-1) + "1", 10) * Number(timeOrLabel.substr(i+1));
				timeOrLabel = (i > 1) ? this._parseTimeOrLabel(timeOrLabel.substr(0, i-1), 0, appendIfAbsent) : this.duration();
			} else if (timeOrLabel == null) {
				timeOrLabel = this.duration();
			}
			return Number(timeOrLabel) + offsetOrLabel;
		};

		p.seek = function(position, suppressEvents) {
			return this.totalTime((typeof(position) === "number") ? position : this._parseTimeOrLabel(position), (suppressEvents !== false));
		};

		p.stop = function() {
			return this.paused(true);
		};

		p.gotoAndPlay = function(position, suppressEvents) {
			return this.play(position, suppressEvents);
		};

		p.gotoAndStop = function(position, suppressEvents) {
			return this.pause(position, suppressEvents);
		};

		p.render = function(time, suppressEvents, force) {
			if (this._gc) {
				this._enabled(true, false);
			}
			var totalDur = (!this._dirty) ? this._totalDuration : this.totalDuration(),
				prevTime = this._time,
				prevStart = this._startTime,
				prevTimeScale = this._timeScale,
				prevPaused = this._paused,
				tween, isComplete, next, callback, internalForce, pauseTween, curTime;
			if (time >= totalDur - 0.0000001 && time >= 0) { //to work around occasional floating point math artifacts.
				this._totalTime = this._time = totalDur;
				if (!this._reversed) if (!this._hasPausedChild()) {
					isComplete = true;
					callback = "onComplete";
					internalForce = !!this._timeline.autoRemoveChildren; //otherwise, if the animation is unpaused/activated after it's already finished, it doesn't get removed from the parent timeline.
					if (this._duration === 0) if ((time <= 0 && time >= -0.0000001) || this._rawPrevTime < 0 || this._rawPrevTime === _tinyNum) if (this._rawPrevTime !== time && this._first) {
						internalForce = true;
						if (this._rawPrevTime > _tinyNum) {
							callback = "onReverseComplete";
						}
					}
				}
				this._rawPrevTime = (this._duration || !suppressEvents || time || this._rawPrevTime === time) ? time : _tinyNum; //when the playhead arrives at EXACTLY time 0 (right on top) of a zero-duration timeline or tween, we need to discern if events are suppressed so that when the playhead moves again (next time), it'll trigger the callback. If events are NOT suppressed, obviously the callback would be triggered in this render. Basically, the callback should fire either when the playhead ARRIVES or LEAVES this exact spot, not both. Imagine doing a timeline.seek(0) and there's a callback that sits at 0. Since events are suppressed on that seek() by default, nothing will fire, but when the playhead moves off of that position, the callback should fire. This behavior is what people intuitively expect. We set the _rawPrevTime to be a precise tiny number to indicate this scenario rather than using another property/variable which would increase memory usage. This technique is less readable, but more efficient.
				time = totalDur + 0.0001; //to avoid occasional floating point rounding errors - sometimes child tweens/timelines were not being fully completed (their progress might be 0.999999999999998 instead of 1 because when _time - tween._startTime is performed, floating point errors would return a value that was SLIGHTLY off). Try (999999999999.7 - 999999999999) * 1 = 0.699951171875 instead of 0.7.

			} else if (time < 0.0000001) { //to work around occasional floating point math artifacts, round super small values to 0.
				this._totalTime = this._time = 0;
				if (prevTime !== 0 || (this._duration === 0 && this._rawPrevTime !== _tinyNum && (this._rawPrevTime > 0 || (time < 0 && this._rawPrevTime >= 0)))) {
					callback = "onReverseComplete";
					isComplete = this._reversed;
				}
				if (time < 0) {
					this._active = false;
					if (this._timeline.autoRemoveChildren && this._reversed) { //ensures proper GC if a timeline is resumed after it's finished reversing.
						internalForce = isComplete = true;
						callback = "onReverseComplete";
					} else if (this._rawPrevTime >= 0 && this._first) { //when going back beyond the start, force a render so that zero-duration tweens that sit at the very beginning render their start values properly. Otherwise, if the parent timeline's playhead lands exactly at this timeline's startTime, and then moves backwards, the zero-duration tweens at the beginning would still be at their end state.
						internalForce = true;
					}
					this._rawPrevTime = time;
				} else {
					this._rawPrevTime = (this._duration || !suppressEvents || time || this._rawPrevTime === time) ? time : _tinyNum; //when the playhead arrives at EXACTLY time 0 (right on top) of a zero-duration timeline or tween, we need to discern if events are suppressed so that when the playhead moves again (next time), it'll trigger the callback. If events are NOT suppressed, obviously the callback would be triggered in this render. Basically, the callback should fire either when the playhead ARRIVES or LEAVES this exact spot, not both. Imagine doing a timeline.seek(0) and there's a callback that sits at 0. Since events are suppressed on that seek() by default, nothing will fire, but when the playhead moves off of that position, the callback should fire. This behavior is what people intuitively expect. We set the _rawPrevTime to be a precise tiny number to indicate this scenario rather than using another property/variable which would increase memory usage. This technique is less readable, but more efficient.
					if (time === 0 && isComplete) { //if there's a zero-duration tween at the very beginning of a timeline and the playhead lands EXACTLY at time 0, that tween will correctly render its end values, but we need to keep the timeline alive for one more render so that the beginning values render properly as the parent's playhead keeps moving beyond the begining. Imagine obj.x starts at 0 and then we do tl.set(obj, {x:100}).to(obj, 1, {x:200}) and then later we tl.reverse()...the goal is to have obj.x revert to 0. If the playhead happens to land on exactly 0, without this chunk of code, it'd complete the timeline and remove it from the rendering queue (not good).
						tween = this._first;
						while (tween && tween._startTime === 0) {
							if (!tween._duration) {
								isComplete = false;
							}
							tween = tween._next;
						}
					}
					time = 0; //to avoid occasional floating point rounding errors (could cause problems especially with zero-duration tweens at the very beginning of the timeline)
					if (!this._initted) {
						internalForce = true;
					}
				}

			} else {

				if (this._hasPause && !this._forcingPlayhead && !suppressEvents) {
					if (time >= prevTime) {
						tween = this._first;
						while (tween && tween._startTime <= time && !pauseTween) {
							if (!tween._duration) if (tween.data === "isPause" && !tween.ratio && !(tween._startTime === 0 && this._rawPrevTime === 0)) {
								pauseTween = tween;
							}
							tween = tween._next;
						}
					} else {
						tween = this._last;
						while (tween && tween._startTime >= time && !pauseTween) {
							if (!tween._duration) if (tween.data === "isPause" && tween._rawPrevTime > 0) {
								pauseTween = tween;
							}
							tween = tween._prev;
						}
					}
					if (pauseTween) {
						this._time = time = pauseTween._startTime;
						this._totalTime = time + (this._cycle * (this._totalDuration + this._repeatDelay));
					}
				}

				this._totalTime = this._time = this._rawPrevTime = time;
			}
			if ((this._time === prevTime || !this._first) && !force && !internalForce && !pauseTween) {
				return;
			} else if (!this._initted) {
				this._initted = true;
			}

			if (!this._active) if (!this._paused && this._time !== prevTime && time > 0) {
				this._active = true;  //so that if the user renders the timeline (as opposed to the parent timeline rendering it), it is forced to re-render and align it with the proper time/frame on the next rendering cycle. Maybe the timeline already finished but the user manually re-renders it as halfway done, for example.
			}

			if (prevTime === 0) if (this.vars.onStart) if (this._time !== 0 || !this._duration) if (!suppressEvents) {
				this._callback("onStart");
			}

			curTime = this._time;
			if (curTime >= prevTime) {
				tween = this._first;
				while (tween) {
					next = tween._next; //record it here because the value could change after rendering...
					if (curTime !== this._time || (this._paused && !prevPaused)) { //in case a tween pauses or seeks the timeline when rendering, like inside of an onUpdate/onComplete
						break;
					} else if (tween._active || (tween._startTime <= curTime && !tween._paused && !tween._gc)) {
						if (pauseTween === tween) {
							this.pause();
						}
						if (!tween._reversed) {
							tween.render((time - tween._startTime) * tween._timeScale, suppressEvents, force);
						} else {
							tween.render(((!tween._dirty) ? tween._totalDuration : tween.totalDuration()) - ((time - tween._startTime) * tween._timeScale), suppressEvents, force);
						}
					}
					tween = next;
				}
			} else {
				tween = this._last;
				while (tween) {
					next = tween._prev; //record it here because the value could change after rendering...
					if (curTime !== this._time || (this._paused && !prevPaused)) { //in case a tween pauses or seeks the timeline when rendering, like inside of an onUpdate/onComplete
						break;
					} else if (tween._active || (tween._startTime <= prevTime && !tween._paused && !tween._gc)) {
						if (pauseTween === tween) {
							pauseTween = tween._prev; //the linked list is organized by _startTime, thus it's possible that a tween could start BEFORE the pause and end after it, in which case it would be positioned before the pause tween in the linked list, but we should render it before we pause() the timeline and cease rendering. This is only a concern when going in reverse.
							while (pauseTween && pauseTween.endTime() > this._time) {
								pauseTween.render( (pauseTween._reversed ? pauseTween.totalDuration() - ((time - pauseTween._startTime) * pauseTween._timeScale) : (time - pauseTween._startTime) * pauseTween._timeScale), suppressEvents, force);
								pauseTween = pauseTween._prev;
							}
							pauseTween = null;
							this.pause();
						}
						if (!tween._reversed) {
							tween.render((time - tween._startTime) * tween._timeScale, suppressEvents, force);
						} else {
							tween.render(((!tween._dirty) ? tween._totalDuration : tween.totalDuration()) - ((time - tween._startTime) * tween._timeScale), suppressEvents, force);
						}
					}
					tween = next;
				}
			}

			if (this._onUpdate) if (!suppressEvents) {
				if (_lazyTweens.length) { //in case rendering caused any tweens to lazy-init, we should render them because typically when a timeline finishes, users expect things to have rendered fully. Imagine an onUpdate on a timeline that reports/checks tweened values.
					_lazyRender();
				}
				this._callback("onUpdate");
			}

			if (callback) if (!this._gc) if (prevStart === this._startTime || prevTimeScale !== this._timeScale) if (this._time === 0 || totalDur >= this.totalDuration()) { //if one of the tweens that was rendered altered this timeline's startTime (like if an onComplete reversed the timeline), it probably isn't complete. If it is, don't worry, because whatever call altered the startTime would complete if it was necessary at the new time. The only exception is the timeScale property. Also check _gc because there's a chance that kill() could be called in an onUpdate
				if (isComplete) {
					if (_lazyTweens.length) { //in case rendering caused any tweens to lazy-init, we should render them because typically when a timeline finishes, users expect things to have rendered fully. Imagine an onComplete on a timeline that reports/checks tweened values.
						_lazyRender();
					}
					if (this._timeline.autoRemoveChildren) {
						this._enabled(false, false);
					}
					this._active = false;
				}
				if (!suppressEvents && this.vars[callback]) {
					this._callback(callback);
				}
			}
		};

		p._hasPausedChild = function() {
			var tween = this._first;
			while (tween) {
				if (tween._paused || ((tween instanceof TimelineLite) && tween._hasPausedChild())) {
					return true;
				}
				tween = tween._next;
			}
			return false;
		};

		p.getChildren = function(nested, tweens, timelines, ignoreBeforeTime) {
			ignoreBeforeTime = ignoreBeforeTime || -9999999999;
			var a = [],
				tween = this._first,
				cnt = 0;
			while (tween) {
				if (tween._startTime < ignoreBeforeTime) {
					//do nothing
				} else if (tween instanceof TweenLite) {
					if (tweens !== false) {
						a[cnt++] = tween;
					}
				} else {
					if (timelines !== false) {
						a[cnt++] = tween;
					}
					if (nested !== false) {
						a = a.concat(tween.getChildren(true, tweens, timelines));
						cnt = a.length;
					}
				}
				tween = tween._next;
			}
			return a;
		};

		p.getTweensOf = function(target, nested) {
			var disabled = this._gc,
				a = [],
				cnt = 0,
				tweens, i;
			if (disabled) {
				this._enabled(true, true); //getTweensOf() filters out disabled tweens, and we have to mark them as _gc = true when the timeline completes in order to allow clean garbage collection, so temporarily re-enable the timeline here.
			}
			tweens = TweenLite.getTweensOf(target);
			i = tweens.length;
			while (--i > -1) {
				if (tweens[i].timeline === this || (nested && this._contains(tweens[i]))) {
					a[cnt++] = tweens[i];
				}
			}
			if (disabled) {
				this._enabled(false, true);
			}
			return a;
		};

		p.recent = function() {
			return this._recent;
		};

		p._contains = function(tween) {
			var tl = tween.timeline;
			while (tl) {
				if (tl === this) {
					return true;
				}
				tl = tl.timeline;
			}
			return false;
		};

		p.shiftChildren = function(amount, adjustLabels, ignoreBeforeTime) {
			ignoreBeforeTime = ignoreBeforeTime || 0;
			var tween = this._first,
				labels = this._labels,
				p;
			while (tween) {
				if (tween._startTime >= ignoreBeforeTime) {
					tween._startTime += amount;
				}
				tween = tween._next;
			}
			if (adjustLabels) {
				for (p in labels) {
					if (labels[p] >= ignoreBeforeTime) {
						labels[p] += amount;
					}
				}
			}
			return this._uncache(true);
		};

		p._kill = function(vars, target) {
			if (!vars && !target) {
				return this._enabled(false, false);
			}
			var tweens = (!target) ? this.getChildren(true, true, false) : this.getTweensOf(target),
				i = tweens.length,
				changed = false;
			while (--i > -1) {
				if (tweens[i]._kill(vars, target)) {
					changed = true;
				}
			}
			return changed;
		};

		p.clear = function(labels) {
			var tweens = this.getChildren(false, true, true),
				i = tweens.length;
			this._time = this._totalTime = 0;
			while (--i > -1) {
				tweens[i]._enabled(false, false);
			}
			if (labels !== false) {
				this._labels = {};
			}
			return this._uncache(true);
		};

		p.invalidate = function() {
			var tween = this._first;
			while (tween) {
				tween.invalidate();
				tween = tween._next;
			}
			return Animation.prototype.invalidate.call(this);;
		};

		p._enabled = function(enabled, ignoreTimeline) {
			if (enabled === this._gc) {
				var tween = this._first;
				while (tween) {
					tween._enabled(enabled, true);
					tween = tween._next;
				}
			}
			return SimpleTimeline.prototype._enabled.call(this, enabled, ignoreTimeline);
		};

		p.totalTime = function(time, suppressEvents, uncapped) {
			this._forcingPlayhead = true;
			var val = Animation.prototype.totalTime.apply(this, arguments);
			this._forcingPlayhead = false;
			return val;
		};

		p.duration = function(value) {
			if (!arguments.length) {
				if (this._dirty) {
					this.totalDuration(); //just triggers recalculation
				}
				return this._duration;
			}
			if (this.duration() !== 0 && value !== 0) {
				this.timeScale(this._duration / value);
			}
			return this;
		};

		p.totalDuration = function(value) {
			if (!arguments.length) {
				if (this._dirty) {
					var max = 0,
						tween = this._last,
						prevStart = 999999999999,
						prev, end;
					while (tween) {
						prev = tween._prev; //record it here in case the tween changes position in the sequence...
						if (tween._dirty) {
							tween.totalDuration(); //could change the tween._startTime, so make sure the tween's cache is clean before analyzing it.
						}
						if (tween._startTime > prevStart && this._sortChildren && !tween._paused) { //in case one of the tweens shifted out of order, it needs to be re-inserted into the correct position in the sequence
							this.add(tween, tween._startTime - tween._delay);
						} else {
							prevStart = tween._startTime;
						}
						if (tween._startTime < 0 && !tween._paused) { //children aren't allowed to have negative startTimes unless smoothChildTiming is true, so adjust here if one is found.
							max -= tween._startTime;
							if (this._timeline.smoothChildTiming) {
								this._startTime += tween._startTime / this._timeScale;
							}
							this.shiftChildren(-tween._startTime, false, -9999999999);
							prevStart = 0;
						}
						end = tween._startTime + (tween._totalDuration / tween._timeScale);
						if (end > max) {
							max = end;
						}
						tween = prev;
					}
					this._duration = this._totalDuration = max;
					this._dirty = false;
				}
				return this._totalDuration;
			}
			return (value && this.totalDuration()) ? this.timeScale(this._totalDuration / value) : this;
		};

		p.paused = function(value) {
			if (!value) { //if there's a pause directly at the spot from where we're unpausing, skip it.
				var tween = this._first,
					time = this._time;
				while (tween) {
					if (tween._startTime === time && tween.data === "isPause") {
						tween._rawPrevTime = 0; //remember, _rawPrevTime is how zero-duration tweens/callbacks sense directionality and determine whether or not to fire. If _rawPrevTime is the same as _startTime on the next render, it won't fire.
					}
					tween = tween._next;
				}
			}
			return Animation.prototype.paused.apply(this, arguments);
		};

		p.usesFrames = function() {
			var tl = this._timeline;
			while (tl._timeline) {
				tl = tl._timeline;
			}
			return (tl === Animation._rootFramesTimeline);
		};

		p.rawTime = function(wrapRepeats) {
			return (wrapRepeats && (this._paused || (this._repeat && this.time() > 0 && this.totalProgress() < 1))) ? this._totalTime % (this._duration + this._repeatDelay) : this._paused ? this._totalTime : (this._timeline.rawTime(wrapRepeats) - this._startTime) * this._timeScale;
		};

		return TimelineLite;

	}, true);








	
	
	
	
	
/*
 * ----------------------------------------------------------------
 * TimelineMax
 * ----------------------------------------------------------------
 */
	_gsScope._gsDefine("TimelineMax", ["TimelineLite","TweenLite","easing.Ease"], function(TimelineLite, TweenLite, Ease) {

		var TimelineMax = function(vars) {
				TimelineLite.call(this, vars);
				this._repeat = this.vars.repeat || 0;
				this._repeatDelay = this.vars.repeatDelay || 0;
				this._cycle = 0;
				this._yoyo = (this.vars.yoyo === true);
				this._dirty = true;
			},
			_tinyNum = 0.0000000001,
			TweenLiteInternals = TweenLite._internals,
			_lazyTweens = TweenLiteInternals.lazyTweens,
			_lazyRender = TweenLiteInternals.lazyRender,
			_globals = _gsScope._gsDefine.globals,
			_easeNone = new Ease(null, null, 1, 0),
			p = TimelineMax.prototype = new TimelineLite();

		p.constructor = TimelineMax;
		p.kill()._gc = false;
		TimelineMax.version = "1.19.1";

		p.invalidate = function() {
			this._yoyo = (this.vars.yoyo === true);
			this._repeat = this.vars.repeat || 0;
			this._repeatDelay = this.vars.repeatDelay || 0;
			this._uncache(true);
			return TimelineLite.prototype.invalidate.call(this);
		};

		p.addCallback = function(callback, position, params, scope) {
			return this.add( TweenLite.delayedCall(0, callback, params, scope), position);
		};

		p.removeCallback = function(callback, position) {
			if (callback) {
				if (position == null) {
					this._kill(null, callback);
				} else {
					var a = this.getTweensOf(callback, false),
						i = a.length,
						time = this._parseTimeOrLabel(position);
					while (--i > -1) {
						if (a[i]._startTime === time) {
							a[i]._enabled(false, false);
						}
					}
				}
			}
			return this;
		};

		p.removePause = function(position) {
			return this.removeCallback(TimelineLite._internals.pauseCallback, position);
		};

		p.tweenTo = function(position, vars) {
			vars = vars || {};
			var copy = {ease:_easeNone, useFrames:this.usesFrames(), immediateRender:false},
				Engine = (vars.repeat && _globals.TweenMax) || TweenLite,
				duration, p, t;
			for (p in vars) {
				copy[p] = vars[p];
			}
			copy.time = this._parseTimeOrLabel(position);
			duration = (Math.abs(Number(copy.time) - this._time) / this._timeScale) || 0.001;
			t = new Engine(this, duration, copy);
			copy.onStart = function() {
				t.target.paused(true);
				if (t.vars.time !== t.target.time() && duration === t.duration()) { //don't make the duration zero - if it's supposed to be zero, don't worry because it's already initting the tween and will complete immediately, effectively making the duration zero anyway. If we make duration zero, the tween won't run at all.
					t.duration( Math.abs( t.vars.time - t.target.time()) / t.target._timeScale );
				}
				if (vars.onStart) { //in case the user had an onStart in the vars - we don't want to overwrite it.
					vars.onStart.apply(vars.onStartScope || vars.callbackScope || t, vars.onStartParams || []); //don't use t._callback("onStart") or it'll point to the copy.onStart and we'll get a recursion error.
				}
			};
			return t;
		};

		p.tweenFromTo = function(fromPosition, toPosition, vars) {
			vars = vars || {};
			fromPosition = this._parseTimeOrLabel(fromPosition);
			vars.startAt = {onComplete:this.seek, onCompleteParams:[fromPosition], callbackScope:this};
			vars.immediateRender = (vars.immediateRender !== false);
			var t = this.tweenTo(toPosition, vars);
			return t.duration((Math.abs( t.vars.time - fromPosition) / this._timeScale) || 0.001);
		};

		p.render = function(time, suppressEvents, force) {
			if (this._gc) {
				this._enabled(true, false);
			}
			var totalDur = (!this._dirty) ? this._totalDuration : this.totalDuration(),
				dur = this._duration,
				prevTime = this._time,
				prevTotalTime = this._totalTime,
				prevStart = this._startTime,
				prevTimeScale = this._timeScale,
				prevRawPrevTime = this._rawPrevTime,
				prevPaused = this._paused,
				prevCycle = this._cycle,
				tween, isComplete, next, callback, internalForce, cycleDuration, pauseTween, curTime;
			if (time >= totalDur - 0.0000001 && time >= 0) { //to work around occasional floating point math artifacts.
				if (!this._locked) {
					this._totalTime = totalDur;
					this._cycle = this._repeat;
				}
				if (!this._reversed) if (!this._hasPausedChild()) {
					isComplete = true;
					callback = "onComplete";
					internalForce = !!this._timeline.autoRemoveChildren; //otherwise, if the animation is unpaused/activated after it's already finished, it doesn't get removed from the parent timeline.
					if (this._duration === 0) if ((time <= 0 && time >= -0.0000001) || prevRawPrevTime < 0 || prevRawPrevTime === _tinyNum) if (prevRawPrevTime !== time && this._first) {
						internalForce = true;
						if (prevRawPrevTime > _tinyNum) {
							callback = "onReverseComplete";
						}
					}
				}
				this._rawPrevTime = (this._duration || !suppressEvents || time || this._rawPrevTime === time) ? time : _tinyNum; //when the playhead arrives at EXACTLY time 0 (right on top) of a zero-duration timeline or tween, we need to discern if events are suppressed so that when the playhead moves again (next time), it'll trigger the callback. If events are NOT suppressed, obviously the callback would be triggered in this render. Basically, the callback should fire either when the playhead ARRIVES or LEAVES this exact spot, not both. Imagine doing a timeline.seek(0) and there's a callback that sits at 0. Since events are suppressed on that seek() by default, nothing will fire, but when the playhead moves off of that position, the callback should fire. This behavior is what people intuitively expect. We set the _rawPrevTime to be a precise tiny number to indicate this scenario rather than using another property/variable which would increase memory usage. This technique is less readable, but more efficient.
				if (this._yoyo && (this._cycle & 1) !== 0) {
					this._time = time = 0;
				} else {
					this._time = dur;
					time = dur + 0.0001; //to avoid occasional floating point rounding errors - sometimes child tweens/timelines were not being fully completed (their progress might be 0.999999999999998 instead of 1 because when _time - tween._startTime is performed, floating point errors would return a value that was SLIGHTLY off). Try (999999999999.7 - 999999999999) * 1 = 0.699951171875 instead of 0.7. We cannot do less then 0.0001 because the same issue can occur when the duration is extremely large like 999999999999 in which case adding 0.00000001, for example, causes it to act like nothing was added.
				}

			} else if (time < 0.0000001) { //to work around occasional floating point math artifacts, round super small values to 0.
				if (!this._locked) {
					this._totalTime = this._cycle = 0;
				}
				this._time = 0;
				if (prevTime !== 0 || (dur === 0 && prevRawPrevTime !== _tinyNum && (prevRawPrevTime > 0 || (time < 0 && prevRawPrevTime >= 0)) && !this._locked)) { //edge case for checking time < 0 && prevRawPrevTime >= 0: a zero-duration fromTo() tween inside a zero-duration timeline (yeah, very rare)
					callback = "onReverseComplete";
					isComplete = this._reversed;
				}
				if (time < 0) {
					this._active = false;
					if (this._timeline.autoRemoveChildren && this._reversed) {
						internalForce = isComplete = true;
						callback = "onReverseComplete";
					} else if (prevRawPrevTime >= 0 && this._first) { //when going back beyond the start, force a render so that zero-duration tweens that sit at the very beginning render their start values properly. Otherwise, if the parent timeline's playhead lands exactly at this timeline's startTime, and then moves backwards, the zero-duration tweens at the beginning would still be at their end state.
						internalForce = true;
					}
					this._rawPrevTime = time;
				} else {
					this._rawPrevTime = (dur || !suppressEvents || time || this._rawPrevTime === time) ? time : _tinyNum; //when the playhead arrives at EXACTLY time 0 (right on top) of a zero-duration timeline or tween, we need to discern if events are suppressed so that when the playhead moves again (next time), it'll trigger the callback. If events are NOT suppressed, obviously the callback would be triggered in this render. Basically, the callback should fire either when the playhead ARRIVES or LEAVES this exact spot, not both. Imagine doing a timeline.seek(0) and there's a callback that sits at 0. Since events are suppressed on that seek() by default, nothing will fire, but when the playhead moves off of that position, the callback should fire. This behavior is what people intuitively expect. We set the _rawPrevTime to be a precise tiny number to indicate this scenario rather than using another property/variable which would increase memory usage. This technique is less readable, but more efficient.
					if (time === 0 && isComplete) { //if there's a zero-duration tween at the very beginning of a timeline and the playhead lands EXACTLY at time 0, that tween will correctly render its end values, but we need to keep the timeline alive for one more render so that the beginning values render properly as the parent's playhead keeps moving beyond the begining. Imagine obj.x starts at 0 and then we do tl.set(obj, {x:100}).to(obj, 1, {x:200}) and then later we tl.reverse()...the goal is to have obj.x revert to 0. If the playhead happens to land on exactly 0, without this chunk of code, it'd complete the timeline and remove it from the rendering queue (not good).
						tween = this._first;
						while (tween && tween._startTime === 0) {
							if (!tween._duration) {
								isComplete = false;
							}
							tween = tween._next;
						}
					}
					time = 0; //to avoid occasional floating point rounding errors (could cause problems especially with zero-duration tweens at the very beginning of the timeline)
					if (!this._initted) {
						internalForce = true;
					}
				}

			} else {
				if (dur === 0 && prevRawPrevTime < 0) { //without this, zero-duration repeating timelines (like with a simple callback nested at the very beginning and a repeatDelay) wouldn't render the first time through.
					internalForce = true;
				}
				this._time = this._rawPrevTime = time;
				if (!this._locked) {
					this._totalTime = time;
					if (this._repeat !== 0) {
						cycleDuration = dur + this._repeatDelay;
						this._cycle = (this._totalTime / cycleDuration) >> 0; //originally _totalTime % cycleDuration but floating point errors caused problems, so I normalized it. (4 % 0.8 should be 0 but it gets reported as 0.79999999!)
						if (this._cycle !== 0) if (this._cycle === this._totalTime / cycleDuration && prevTotalTime <= time) {
							this._cycle--; //otherwise when rendered exactly at the end time, it will act as though it is repeating (at the beginning)
						}
						this._time = this._totalTime - (this._cycle * cycleDuration);
						if (this._yoyo) if ((this._cycle & 1) !== 0) {
							this._time = dur - this._time;
						}
						if (this._time > dur) {
							this._time = dur;
							time = dur + 0.0001; //to avoid occasional floating point rounding error
						} else if (this._time < 0) {
							this._time = time = 0;
						} else {
							time = this._time;
						}
					}
				}

				if (this._hasPause && !this._forcingPlayhead && !suppressEvents && time < dur) {
					time = this._time;
					if (time >= prevTime || (this._repeat && prevCycle !== this._cycle)) {
						tween = this._first;
						while (tween && tween._startTime <= time && !pauseTween) {
							if (!tween._duration) if (tween.data === "isPause" && !tween.ratio && !(tween._startTime === 0 && this._rawPrevTime === 0)) {
								pauseTween = tween;
							}
							tween = tween._next;
						}
					} else {
						tween = this._last;
						while (tween && tween._startTime >= time && !pauseTween) {
							if (!tween._duration) if (tween.data === "isPause" && tween._rawPrevTime > 0) {
								pauseTween = tween;
							}
							tween = tween._prev;
						}
					}
					if (pauseTween) {
						this._time = time = pauseTween._startTime;
						this._totalTime = time + (this._cycle * (this._totalDuration + this._repeatDelay));
					}
				}

			}

			if (this._cycle !== prevCycle) if (!this._locked) {
				/*
				make sure children at the end/beginning of the timeline are rendered properly. If, for example,
				a 3-second long timeline rendered at 2.9 seconds previously, and now renders at 3.2 seconds (which
				would get transated to 2.8 seconds if the timeline yoyos or 0.2 seconds if it just repeats), there
				could be a callback or a short tween that's at 2.95 or 3 seconds in which wouldn't render. So
				we need to push the timeline to the end (and/or beginning depending on its yoyo value). Also we must
				ensure that zero-duration tweens at the very beginning or end of the TimelineMax work.
				*/
				var backwards = (this._yoyo && (prevCycle & 1) !== 0),
					wrap = (backwards === (this._yoyo && (this._cycle & 1) !== 0)),
					recTotalTime = this._totalTime,
					recCycle = this._cycle,
					recRawPrevTime = this._rawPrevTime,
					recTime = this._time;

				this._totalTime = prevCycle * dur;
				if (this._cycle < prevCycle) {
					backwards = !backwards;
				} else {
					this._totalTime += dur;
				}
				this._time = prevTime; //temporarily revert _time so that render() renders the children in the correct order. Without this, tweens won't rewind correctly. We could arhictect things in a "cleaner" way by splitting out the rendering queue into a separate method but for performance reasons, we kept it all inside this method.

				this._rawPrevTime = (dur === 0) ? prevRawPrevTime - 0.0001 : prevRawPrevTime;
				this._cycle = prevCycle;
				this._locked = true; //prevents changes to totalTime and skips repeat/yoyo behavior when we recursively call render()
				prevTime = (backwards) ? 0 : dur;
				this.render(prevTime, suppressEvents, (dur === 0));
				if (!suppressEvents) if (!this._gc) {
					if (this.vars.onRepeat) {
						this._cycle = recCycle; //in case the onRepeat alters the playhead or invalidates(), we shouldn't stay locked or use the previous cycle.
						this._locked = false;
						this._callback("onRepeat");
					}
				}
				if (prevTime !== this._time) { //in case there's a callback like onComplete in a nested tween/timeline that changes the playhead position, like via seek(), we should just abort.
					return;
				}
				if (wrap) {
					this._cycle = prevCycle; //if there's an onRepeat, we reverted this above, so make sure it's set properly again. We also unlocked in that scenario, so reset that too.
					this._locked = true;
					prevTime = (backwards) ? dur + 0.0001 : -0.0001;
					this.render(prevTime, true, false);
				}
				this._locked = false;
				if (this._paused && !prevPaused) { //if the render() triggered callback that paused this timeline, we should abort (very rare, but possible)
					return;
				}
				this._time = recTime;
				this._totalTime = recTotalTime;
				this._cycle = recCycle;
				this._rawPrevTime = recRawPrevTime;
			}

			if ((this._time === prevTime || !this._first) && !force && !internalForce && !pauseTween) {
				if (prevTotalTime !== this._totalTime) if (this._onUpdate) if (!suppressEvents) { //so that onUpdate fires even during the repeatDelay - as long as the totalTime changed, we should trigger onUpdate.
					this._callback("onUpdate");
				}
				return;
			} else if (!this._initted) {
				this._initted = true;
			}

			if (!this._active) if (!this._paused && this._totalTime !== prevTotalTime && time > 0) {
				this._active = true;  //so that if the user renders the timeline (as opposed to the parent timeline rendering it), it is forced to re-render and align it with the proper time/frame on the next rendering cycle. Maybe the timeline already finished but the user manually re-renders it as halfway done, for example.
			}

			if (prevTotalTime === 0) if (this.vars.onStart) if (this._totalTime !== 0 || !this._totalDuration) if (!suppressEvents) {
				this._callback("onStart");
			}

			curTime = this._time;
			if (curTime >= prevTime) {
				tween = this._first;
				while (tween) {
					next = tween._next; //record it here because the value could change after rendering...
					if (curTime !== this._time || (this._paused && !prevPaused)) { //in case a tween pauses or seeks the timeline when rendering, like inside of an onUpdate/onComplete
						break;
					} else if (tween._active || (tween._startTime <= this._time && !tween._paused && !tween._gc)) {
						if (pauseTween === tween) {
							this.pause();
						}
						if (!tween._reversed) {
							tween.render((time - tween._startTime) * tween._timeScale, suppressEvents, force);
						} else {
							tween.render(((!tween._dirty) ? tween._totalDuration : tween.totalDuration()) - ((time - tween._startTime) * tween._timeScale), suppressEvents, force);
						}
					}
					tween = next;
				}
			} else {
				tween = this._last;
				while (tween) {
					next = tween._prev; //record it here because the value could change after rendering...
					if (curTime !== this._time || (this._paused && !prevPaused)) { //in case a tween pauses or seeks the timeline when rendering, like inside of an onUpdate/onComplete
						break;
					} else if (tween._active || (tween._startTime <= prevTime && !tween._paused && !tween._gc)) {
						if (pauseTween === tween) {
							pauseTween = tween._prev; //the linked list is organized by _startTime, thus it's possible that a tween could start BEFORE the pause and end after it, in which case it would be positioned before the pause tween in the linked list, but we should render it before we pause() the timeline and cease rendering. This is only a concern when going in reverse.
							while (pauseTween && pauseTween.endTime() > this._time) {
								pauseTween.render( (pauseTween._reversed ? pauseTween.totalDuration() - ((time - pauseTween._startTime) * pauseTween._timeScale) : (time - pauseTween._startTime) * pauseTween._timeScale), suppressEvents, force);
								pauseTween = pauseTween._prev;
							}
							pauseTween = null;
							this.pause();
						}
						if (!tween._reversed) {
							tween.render((time - tween._startTime) * tween._timeScale, suppressEvents, force);
						} else {
							tween.render(((!tween._dirty) ? tween._totalDuration : tween.totalDuration()) - ((time - tween._startTime) * tween._timeScale), suppressEvents, force);
						}
					}
					tween = next;
				}
			}

			if (this._onUpdate) if (!suppressEvents) {
				if (_lazyTweens.length) { //in case rendering caused any tweens to lazy-init, we should render them because typically when a timeline finishes, users expect things to have rendered fully. Imagine an onUpdate on a timeline that reports/checks tweened values.
					_lazyRender();
				}
				this._callback("onUpdate");
			}
			if (callback) if (!this._locked) if (!this._gc) if (prevStart === this._startTime || prevTimeScale !== this._timeScale) if (this._time === 0 || totalDur >= this.totalDuration()) { //if one of the tweens that was rendered altered this timeline's startTime (like if an onComplete reversed the timeline), it probably isn't complete. If it is, don't worry, because whatever call altered the startTime would complete if it was necessary at the new time. The only exception is the timeScale property. Also check _gc because there's a chance that kill() could be called in an onUpdate
				if (isComplete) {
					if (_lazyTweens.length) { //in case rendering caused any tweens to lazy-init, we should render them because typically when a timeline finishes, users expect things to have rendered fully. Imagine an onComplete on a timeline that reports/checks tweened values.
						_lazyRender();
					}
					if (this._timeline.autoRemoveChildren) {
						this._enabled(false, false);
					}
					this._active = false;
				}
				if (!suppressEvents && this.vars[callback]) {
					this._callback(callback);
				}
			}
		};

		p.getActive = function(nested, tweens, timelines) {
			if (nested == null) {
				nested = true;
			}
			if (tweens == null) {
				tweens = true;
			}
			if (timelines == null) {
				timelines = false;
			}
			var a = [],
				all = this.getChildren(nested, tweens, timelines),
				cnt = 0,
				l = all.length,
				i, tween;
			for (i = 0; i < l; i++) {
				tween = all[i];
				if (tween.isActive()) {
					a[cnt++] = tween;
				}
			}
			return a;
		};


		p.getLabelAfter = function(time) {
			if (!time) if (time !== 0) { //faster than isNan()
				time = this._time;
			}
			var labels = this.getLabelsArray(),
				l = labels.length,
				i;
			for (i = 0; i < l; i++) {
				if (labels[i].time > time) {
					return labels[i].name;
				}
			}
			return null;
		};

		p.getLabelBefore = function(time) {
			if (time == null) {
				time = this._time;
			}
			var labels = this.getLabelsArray(),
				i = labels.length;
			while (--i > -1) {
				if (labels[i].time < time) {
					return labels[i].name;
				}
			}
			return null;
		};

		p.getLabelsArray = function() {
			var a = [],
				cnt = 0,
				p;
			for (p in this._labels) {
				a[cnt++] = {time:this._labels[p], name:p};
			}
			a.sort(function(a,b) {
				return a.time - b.time;
			});
			return a;
		};

		p.invalidate = function() {
			this._locked = false; //unlock and set cycle in case invalidate() is called from inside an onRepeat
			return TimelineLite.prototype.invalidate.call(this);
		};


//---- GETTERS / SETTERS -------------------------------------------------------------------------------------------------------

		p.progress = function(value, suppressEvents) {
			return (!arguments.length) ? this._time / this.duration() : this.totalTime( this.duration() * ((this._yoyo && (this._cycle & 1) !== 0) ? 1 - value : value) + (this._cycle * (this._duration + this._repeatDelay)), suppressEvents);
		};

		p.totalProgress = function(value, suppressEvents) {
			return (!arguments.length) ? this._totalTime / this.totalDuration() : this.totalTime( this.totalDuration() * value, suppressEvents);
		};

		p.totalDuration = function(value) {
			if (!arguments.length) {
				if (this._dirty) {
					TimelineLite.prototype.totalDuration.call(this); //just forces refresh
					//Instead of Infinity, we use 999999999999 so that we can accommodate reverses.
					this._totalDuration = (this._repeat === -1) ? 999999999999 : this._duration * (this._repeat + 1) + (this._repeatDelay * this._repeat);
				}
				return this._totalDuration;
			}
			return (this._repeat === -1 || !value) ? this : this.timeScale( this.totalDuration() / value );
		};

		p.time = function(value, suppressEvents) {
			if (!arguments.length) {
				return this._time;
			}
			if (this._dirty) {
				this.totalDuration();
			}
			if (value > this._duration) {
				value = this._duration;
			}
			if (this._yoyo && (this._cycle & 1) !== 0) {
				value = (this._duration - value) + (this._cycle * (this._duration + this._repeatDelay));
			} else if (this._repeat !== 0) {
				value += this._cycle * (this._duration + this._repeatDelay);
			}
			return this.totalTime(value, suppressEvents);
		};

		p.repeat = function(value) {
			if (!arguments.length) {
				return this._repeat;
			}
			this._repeat = value;
			return this._uncache(true);
		};

		p.repeatDelay = function(value) {
			if (!arguments.length) {
				return this._repeatDelay;
			}
			this._repeatDelay = value;
			return this._uncache(true);
		};

		p.yoyo = function(value) {
			if (!arguments.length) {
				return this._yoyo;
			}
			this._yoyo = value;
			return this;
		};

		p.currentLabel = function(value) {
			if (!arguments.length) {
				return this.getLabelBefore(this._time + 0.00000001);
			}
			return this.seek(value, true);
		};

		return TimelineMax;

	}, true);
	




	
	
	
	
	
	
	
/*
 * ----------------------------------------------------------------
 * BezierPlugin
 * ----------------------------------------------------------------
 */
	(function() {

		var _RAD2DEG = 180 / Math.PI,
			_r1 = [],
			_r2 = [],
			_r3 = [],
			_corProps = {},
			_globals = _gsScope._gsDefine.globals,
			Segment = function(a, b, c, d) {
				if (c === d) { //if c and d match, the final autoRotate value could lock at -90 degrees, so differentiate them slightly.
					c = d - (d - b) / 1000000;
				}
				if (a === b) { //if a and b match, the starting autoRotate value could lock at -90 degrees, so differentiate them slightly.
					b = a + (c - a) / 1000000;
				}
				this.a = a;
				this.b = b;
				this.c = c;
				this.d = d;
				this.da = d - a;
				this.ca = c - a;
				this.ba = b - a;
			},
			_correlate = ",x,y,z,left,top,right,bottom,marginTop,marginLeft,marginRight,marginBottom,paddingLeft,paddingTop,paddingRight,paddingBottom,backgroundPosition,backgroundPosition_y,",
			cubicToQuadratic = function(a, b, c, d) {
				var q1 = {a:a},
					q2 = {},
					q3 = {},
					q4 = {c:d},
					mab = (a + b) / 2,
					mbc = (b + c) / 2,
					mcd = (c + d) / 2,
					mabc = (mab + mbc) / 2,
					mbcd = (mbc + mcd) / 2,
					m8 = (mbcd - mabc) / 8;
				q1.b = mab + (a - mab) / 4;
				q2.b = mabc + m8;
				q1.c = q2.a = (q1.b + q2.b) / 2;
				q2.c = q3.a = (mabc + mbcd) / 2;
				q3.b = mbcd - m8;
				q4.b = mcd + (d - mcd) / 4;
				q3.c = q4.a = (q3.b + q4.b) / 2;
				return [q1, q2, q3, q4];
			},
			_calculateControlPoints = function(a, curviness, quad, basic, correlate) {
				var l = a.length - 1,
					ii = 0,
					cp1 = a[0].a,
					i, p1, p2, p3, seg, m1, m2, mm, cp2, qb, r1, r2, tl;
				for (i = 0; i < l; i++) {
					seg = a[ii];
					p1 = seg.a;
					p2 = seg.d;
					p3 = a[ii+1].d;

					if (correlate) {
						r1 = _r1[i];
						r2 = _r2[i];
						tl = ((r2 + r1) * curviness * 0.25) / (basic ? 0.5 : _r3[i] || 0.5);
						m1 = p2 - (p2 - p1) * (basic ? curviness * 0.5 : (r1 !== 0 ? tl / r1 : 0));
						m2 = p2 + (p3 - p2) * (basic ? curviness * 0.5 : (r2 !== 0 ? tl / r2 : 0));
						mm = p2 - (m1 + (((m2 - m1) * ((r1 * 3 / (r1 + r2)) + 0.5) / 4) || 0));
					} else {
						m1 = p2 - (p2 - p1) * curviness * 0.5;
						m2 = p2 + (p3 - p2) * curviness * 0.5;
						mm = p2 - (m1 + m2) / 2;
					}
					m1 += mm;
					m2 += mm;

					seg.c = cp2 = m1;
					if (i !== 0) {
						seg.b = cp1;
					} else {
						seg.b = cp1 = seg.a + (seg.c - seg.a) * 0.6; //instead of placing b on a exactly, we move it inline with c so that if the user specifies an ease like Back.easeIn or Elastic.easeIn which goes BEYOND the beginning, it will do so smoothly.
					}

					seg.da = p2 - p1;
					seg.ca = cp2 - p1;
					seg.ba = cp1 - p1;

					if (quad) {
						qb = cubicToQuadratic(p1, cp1, cp2, p2);
						a.splice(ii, 1, qb[0], qb[1], qb[2], qb[3]);
						ii += 4;
					} else {
						ii++;
					}

					cp1 = m2;
				}
				seg = a[ii];
				seg.b = cp1;
				seg.c = cp1 + (seg.d - cp1) * 0.4; //instead of placing c on d exactly, we move it inline with b so that if the user specifies an ease like Back.easeOut or Elastic.easeOut which goes BEYOND the end, it will do so smoothly.
				seg.da = seg.d - seg.a;
				seg.ca = seg.c - seg.a;
				seg.ba = cp1 - seg.a;
				if (quad) {
					qb = cubicToQuadratic(seg.a, cp1, seg.c, seg.d);
					a.splice(ii, 1, qb[0], qb[1], qb[2], qb[3]);
				}
			},
			_parseAnchors = function(values, p, correlate, prepend) {
				var a = [],
					l, i, p1, p2, p3, tmp;
				if (prepend) {
					values = [prepend].concat(values);
					i = values.length;
					while (--i > -1) {
						if (typeof( (tmp = values[i][p]) ) === "string") if (tmp.charAt(1) === "=") {
							values[i][p] = prepend[p] + Number(tmp.charAt(0) + tmp.substr(2)); //accommodate relative values. Do it inline instead of breaking it out into a function for speed reasons
						}
					}
				}
				l = values.length - 2;
				if (l < 0) {
					a[0] = new Segment(values[0][p], 0, 0, values[(l < -1) ? 0 : 1][p]);
					return a;
				}
				for (i = 0; i < l; i++) {
					p1 = values[i][p];
					p2 = values[i+1][p];
					a[i] = new Segment(p1, 0, 0, p2);
					if (correlate) {
						p3 = values[i+2][p];
						_r1[i] = (_r1[i] || 0) + (p2 - p1) * (p2 - p1);
						_r2[i] = (_r2[i] || 0) + (p3 - p2) * (p3 - p2);
					}
				}
				a[i] = new Segment(values[i][p], 0, 0, values[i+1][p]);
				return a;
			},
			bezierThrough = function(values, curviness, quadratic, basic, correlate, prepend) {
				var obj = {},
					props = [],
					first = prepend || values[0],
					i, p, a, j, r, l, seamless, last;
				correlate = (typeof(correlate) === "string") ? ","+correlate+"," : _correlate;
				if (curviness == null) {
					curviness = 1;
				}
				for (p in values[0]) {
					props.push(p);
				}
				//check to see if the last and first values are identical (well, within 0.05). If so, make seamless by appending the second element to the very end of the values array and the 2nd-to-last element to the very beginning (we'll remove those segments later)
				if (values.length > 1) {
					last = values[values.length - 1];
					seamless = true;
					i = props.length;
					while (--i > -1) {
						p = props[i];
						if (Math.abs(first[p] - last[p]) > 0.05) { //build in a tolerance of +/-0.05 to accommodate rounding errors.
							seamless = false;
							break;
						}
					}
					if (seamless) {
						values = values.concat(); //duplicate the array to avoid contaminating the original which the user may be reusing for other tweens
						if (prepend) {
							values.unshift(prepend);
						}
						values.push(values[1]);
						prepend = values[values.length - 3];
					}
				}
				_r1.length = _r2.length = _r3.length = 0;
				i = props.length;
				while (--i > -1) {
					p = props[i];
					_corProps[p] = (correlate.indexOf(","+p+",") !== -1);
					obj[p] = _parseAnchors(values, p, _corProps[p], prepend);
				}
				i = _r1.length;
				while (--i > -1) {
					_r1[i] = Math.sqrt(_r1[i]);
					_r2[i] = Math.sqrt(_r2[i]);
				}
				if (!basic) {
					i = props.length;
					while (--i > -1) {
						if (_corProps[p]) {
							a = obj[props[i]];
							l = a.length - 1;
							for (j = 0; j < l; j++) {
								r = (a[j+1].da / _r2[j] + a[j].da / _r1[j]) || 0;
								_r3[j] = (_r3[j] || 0) + r * r;
							}
						}
					}
					i = _r3.length;
					while (--i > -1) {
						_r3[i] = Math.sqrt(_r3[i]);
					}
				}
				i = props.length;
				j = quadratic ? 4 : 1;
				while (--i > -1) {
					p = props[i];
					a = obj[p];
					_calculateControlPoints(a, curviness, quadratic, basic, _corProps[p]); //this method requires that _parseAnchors() and _setSegmentRatios() ran first so that _r1, _r2, and _r3 values are populated for all properties
					if (seamless) {
						a.splice(0, j);
						a.splice(a.length - j, j);
					}
				}
				return obj;
			},
			_parseBezierData = function(values, type, prepend) {
				type = type || "soft";
				var obj = {},
					inc = (type === "cubic") ? 3 : 2,
					soft = (type === "soft"),
					props = [],
					a, b, c, d, cur, i, j, l, p, cnt, tmp;
				if (soft && prepend) {
					values = [prepend].concat(values);
				}
				if (values == null || values.length < inc + 1) { throw "invalid Bezier data"; }
				for (p in values[0]) {
					props.push(p);
				}
				i = props.length;
				while (--i > -1) {
					p = props[i];
					obj[p] = cur = [];
					cnt = 0;
					l = values.length;
					for (j = 0; j < l; j++) {
						a = (prepend == null) ? values[j][p] : (typeof( (tmp = values[j][p]) ) === "string" && tmp.charAt(1) === "=") ? prepend[p] + Number(tmp.charAt(0) + tmp.substr(2)) : Number(tmp);
						if (soft) if (j > 1) if (j < l - 1) {
							cur[cnt++] = (a + cur[cnt-2]) / 2;
						}
						cur[cnt++] = a;
					}
					l = cnt - inc + 1;
					cnt = 0;
					for (j = 0; j < l; j += inc) {
						a = cur[j];
						b = cur[j+1];
						c = cur[j+2];
						d = (inc === 2) ? 0 : cur[j+3];
						cur[cnt++] = tmp = (inc === 3) ? new Segment(a, b, c, d) : new Segment(a, (2 * b + a) / 3, (2 * b + c) / 3, c);
					}
					cur.length = cnt;
				}
				return obj;
			},
			_addCubicLengths = function(a, steps, resolution) {
				var inc = 1 / resolution,
					j = a.length,
					d, d1, s, da, ca, ba, p, i, inv, bez, index;
				while (--j > -1) {
					bez = a[j];
					s = bez.a;
					da = bez.d - s;
					ca = bez.c - s;
					ba = bez.b - s;
					d = d1 = 0;
					for (i = 1; i <= resolution; i++) {
						p = inc * i;
						inv = 1 - p;
						d = d1 - (d1 = (p * p * da + 3 * inv * (p * ca + inv * ba)) * p);
						index = j * resolution + i - 1;
						steps[index] = (steps[index] || 0) + d * d;
					}
				}
			},
			_parseLengthData = function(obj, resolution) {
				resolution = resolution >> 0 || 6;
				var a = [],
					lengths = [],
					d = 0,
					total = 0,
					threshold = resolution - 1,
					segments = [],
					curLS = [], //current length segments array
					p, i, l, index;
				for (p in obj) {
					_addCubicLengths(obj[p], a, resolution);
				}
				l = a.length;
				for (i = 0; i < l; i++) {
					d += Math.sqrt(a[i]);
					index = i % resolution;
					curLS[index] = d;
					if (index === threshold) {
						total += d;
						index = (i / resolution) >> 0;
						segments[index] = curLS;
						lengths[index] = total;
						d = 0;
						curLS = [];
					}
				}
				return {length:total, lengths:lengths, segments:segments};
			},



			BezierPlugin = _gsScope._gsDefine.plugin({
					propName: "bezier",
					priority: -1,
					version: "1.3.7",
					API: 2,
					global:true,

					//gets called when the tween renders for the first time. This is where initial values should be recorded and any setup routines should run.
					init: function(target, vars, tween) {
						this._target = target;
						if (vars instanceof Array) {
							vars = {values:vars};
						}
						this._func = {};
						this._mod = {};
						this._props = [];
						this._timeRes = (vars.timeResolution == null) ? 6 : parseInt(vars.timeResolution, 10);
						var values = vars.values || [],
							first = {},
							second = values[0],
							autoRotate = vars.autoRotate || tween.vars.orientToBezier,
							p, isFunc, i, j, prepend;

						this._autoRotate = autoRotate ? (autoRotate instanceof Array) ? autoRotate : [["x","y","rotation",((autoRotate === true) ? 0 : Number(autoRotate) || 0)]] : null;
						for (p in second) {
							this._props.push(p);
						}

						i = this._props.length;
						while (--i > -1) {
							p = this._props[i];

							this._overwriteProps.push(p);
							isFunc = this._func[p] = (typeof(target[p]) === "function");
							first[p] = (!isFunc) ? parseFloat(target[p]) : target[ ((p.indexOf("set") || typeof(target["get" + p.substr(3)]) !== "function") ? p : "get" + p.substr(3)) ]();
							if (!prepend) if (first[p] !== values[0][p]) {
								prepend = first;
							}
						}
						this._beziers = (vars.type !== "cubic" && vars.type !== "quadratic" && vars.type !== "soft") ? bezierThrough(values, isNaN(vars.curviness) ? 1 : vars.curviness, false, (vars.type === "thruBasic"), vars.correlate, prepend) : _parseBezierData(values, vars.type, first);
						this._segCount = this._beziers[p].length;

						if (this._timeRes) {
							var ld = _parseLengthData(this._beziers, this._timeRes);
							this._length = ld.length;
							this._lengths = ld.lengths;
							this._segments = ld.segments;
							this._l1 = this._li = this._s1 = this._si = 0;
							this._l2 = this._lengths[0];
							this._curSeg = this._segments[0];
							this._s2 = this._curSeg[0];
							this._prec = 1 / this._curSeg.length;
						}

						if ((autoRotate = this._autoRotate)) {
							this._initialRotations = [];
							if (!(autoRotate[0] instanceof Array)) {
								this._autoRotate = autoRotate = [autoRotate];
							}
							i = autoRotate.length;
							while (--i > -1) {
								for (j = 0; j < 3; j++) {
									p = autoRotate[i][j];
									this._func[p] = (typeof(target[p]) === "function") ? target[ ((p.indexOf("set") || typeof(target["get" + p.substr(3)]) !== "function") ? p : "get" + p.substr(3)) ] : false;
								}
								p = autoRotate[i][2];
								this._initialRotations[i] = (this._func[p] ? this._func[p].call(this._target) : this._target[p]) || 0;
								this._overwriteProps.push(p);
							}
						}
						this._startRatio = tween.vars.runBackwards ? 1 : 0; //we determine the starting ratio when the tween inits which is always 0 unless the tween has runBackwards:true (indicating it's a from() tween) in which case it's 1.
						return true;
					},

					//called each time the values should be updated, and the ratio gets passed as the only parameter (typically it's a value between 0 and 1, but it can exceed those when using an ease like Elastic.easeOut or Back.easeOut, etc.)
					set: function(v) {
						var segments = this._segCount,
							func = this._func,
							target = this._target,
							notStart = (v !== this._startRatio),
							curIndex, inv, i, p, b, t, val, l, lengths, curSeg;
						if (!this._timeRes) {
							curIndex = (v < 0) ? 0 : (v >= 1) ? segments - 1 : (segments * v) >> 0;
							t = (v - (curIndex * (1 / segments))) * segments;
						} else {
							lengths = this._lengths;
							curSeg = this._curSeg;
							v *= this._length;
							i = this._li;
							//find the appropriate segment (if the currently cached one isn't correct)
							if (v > this._l2 && i < segments - 1) {
								l = segments - 1;
								while (i < l && (this._l2 = lengths[++i]) <= v) {	}
								this._l1 = lengths[i-1];
								this._li = i;
								this._curSeg = curSeg = this._segments[i];
								this._s2 = curSeg[(this._s1 = this._si = 0)];
							} else if (v < this._l1 && i > 0) {
								while (i > 0 && (this._l1 = lengths[--i]) >= v) { }
								if (i === 0 && v < this._l1) {
									this._l1 = 0;
								} else {
									i++;
								}
								this._l2 = lengths[i];
								this._li = i;
								this._curSeg = curSeg = this._segments[i];
								this._s1 = curSeg[(this._si = curSeg.length - 1) - 1] || 0;
								this._s2 = curSeg[this._si];
							}
							curIndex = i;
							//now find the appropriate sub-segment (we split it into the number of pieces that was defined by "precision" and measured each one)
							v -= this._l1;
							i = this._si;
							if (v > this._s2 && i < curSeg.length - 1) {
								l = curSeg.length - 1;
								while (i < l && (this._s2 = curSeg[++i]) <= v) {	}
								this._s1 = curSeg[i-1];
								this._si = i;
							} else if (v < this._s1 && i > 0) {
								while (i > 0 && (this._s1 = curSeg[--i]) >= v) {	}
								if (i === 0 && v < this._s1) {
									this._s1 = 0;
								} else {
									i++;
								}
								this._s2 = curSeg[i];
								this._si = i;
							}
							t = ((i + (v - this._s1) / (this._s2 - this._s1)) * this._prec) || 0;
						}
						inv = 1 - t;

						i = this._props.length;
						while (--i > -1) {
							p = this._props[i];
							b = this._beziers[p][curIndex];
							val = (t * t * b.da + 3 * inv * (t * b.ca + inv * b.ba)) * t + b.a;
							if (this._mod[p]) {
								val = this._mod[p](val, target);
							}
							if (func[p]) {
								target[p](val);
							} else {
								target[p] = val;
							}
						}

						if (this._autoRotate) {
							var ar = this._autoRotate,
								b2, x1, y1, x2, y2, add, conv;
							i = ar.length;
							while (--i > -1) {
								p = ar[i][2];
								add = ar[i][3] || 0;
								conv = (ar[i][4] === true) ? 1 : _RAD2DEG;
								b = this._beziers[ar[i][0]];
								b2 = this._beziers[ar[i][1]];

								if (b && b2) { //in case one of the properties got overwritten.
									b = b[curIndex];
									b2 = b2[curIndex];

									x1 = b.a + (b.b - b.a) * t;
									x2 = b.b + (b.c - b.b) * t;
									x1 += (x2 - x1) * t;
									x2 += ((b.c + (b.d - b.c) * t) - x2) * t;

									y1 = b2.a + (b2.b - b2.a) * t;
									y2 = b2.b + (b2.c - b2.b) * t;
									y1 += (y2 - y1) * t;
									y2 += ((b2.c + (b2.d - b2.c) * t) - y2) * t;

									val = notStart ? Math.atan2(y2 - y1, x2 - x1) * conv + add : this._initialRotations[i];

									if (this._mod[p]) {
										val = this._mod[p](val, target); //for modProps
									}

									if (func[p]) {
										target[p](val);
									} else {
										target[p] = val;
									}
								}
							}
						}
					}
			}),
			p = BezierPlugin.prototype;


		BezierPlugin.bezierThrough = bezierThrough;
		BezierPlugin.cubicToQuadratic = cubicToQuadratic;
		BezierPlugin._autoCSS = true; //indicates that this plugin can be inserted into the "css" object using the autoCSS feature of TweenLite
		BezierPlugin.quadraticToCubic = function(a, b, c) {
			return new Segment(a, (2 * b + a) / 3, (2 * b + c) / 3, c);
		};

		BezierPlugin._cssRegister = function() {
			var CSSPlugin = _globals.CSSPlugin;
			if (!CSSPlugin) {
				return;
			}
			var _internals = CSSPlugin._internals,
				_parseToProxy = _internals._parseToProxy,
				_setPluginRatio = _internals._setPluginRatio,
				CSSPropTween = _internals.CSSPropTween;
			_internals._registerComplexSpecialProp("bezier", {parser:function(t, e, prop, cssp, pt, plugin) {
				if (e instanceof Array) {
					e = {values:e};
				}
				plugin = new BezierPlugin();
				var values = e.values,
					l = values.length - 1,
					pluginValues = [],
					v = {},
					i, p, data;
				if (l < 0) {
					return pt;
				}
				for (i = 0; i <= l; i++) {
					data = _parseToProxy(t, values[i], cssp, pt, plugin, (l !== i));
					pluginValues[i] = data.end;
				}
				for (p in e) {
					v[p] = e[p]; //duplicate the vars object because we need to alter some things which would cause problems if the user plans to reuse the same vars object for another tween.
				}
				v.values = pluginValues;
				pt = new CSSPropTween(t, "bezier", 0, 0, data.pt, 2);
				pt.data = data;
				pt.plugin = plugin;
				pt.setRatio = _setPluginRatio;
				if (v.autoRotate === 0) {
					v.autoRotate = true;
				}
				if (v.autoRotate && !(v.autoRotate instanceof Array)) {
					i = (v.autoRotate === true) ? 0 : Number(v.autoRotate);
					v.autoRotate = (data.end.left != null) ? [["left","top","rotation",i,false]] : (data.end.x != null) ? [["x","y","rotation",i,false]] : false;
				}
				if (v.autoRotate) {
					if (!cssp._transform) {
						cssp._enableTransforms(false);
					}
					data.autoRotate = cssp._target._gsTransform;
					data.proxy.rotation = data.autoRotate.rotation || 0;
					cssp._overwriteProps.push("rotation");
				}
				plugin._onInitTween(data.proxy, v, cssp._tween);
				return pt;
			}});
		};

		p._mod = function(lookup) {
			var op = this._overwriteProps,
				i = op.length,
				val;
			while (--i > -1) {
				val = lookup[op[i]];
				if (val && typeof(val) === "function") {
					this._mod[op[i]] = val;
				}
			}
		};

		p._kill = function(lookup) {
			var a = this._props,
				p, i;
			for (p in this._beziers) {
				if (p in lookup) {
					delete this._beziers[p];
					delete this._func[p];
					i = a.length;
					while (--i > -1) {
						if (a[i] === p) {
							a.splice(i, 1);
						}
					}
				}
			}
			a = this._autoRotate;
			if (a) {
				i = a.length;
				while (--i > -1) {
					if (lookup[a[i][2]]) {
						a.splice(i, 1);
					}
				}
			}
			return this._super._kill.call(this, lookup);
		};

	}());






	
	
	
	
	
	
	
	
/*
 * ----------------------------------------------------------------
 * CSSPlugin
 * ----------------------------------------------------------------
 */
	_gsScope._gsDefine("plugins.CSSPlugin", ["plugins.TweenPlugin","TweenLite"], function(TweenPlugin, TweenLite) {

		/** @constructor **/
		var CSSPlugin = function() {
				TweenPlugin.call(this, "css");
				this._overwriteProps.length = 0;
				this.setRatio = CSSPlugin.prototype.setRatio; //speed optimization (avoid prototype lookup on this "hot" method)
			},
			_globals = _gsScope._gsDefine.globals,
			_hasPriority, //turns true whenever a CSSPropTween instance is created that has a priority other than 0. This helps us discern whether or not we should spend the time organizing the linked list or not after a CSSPlugin's _onInitTween() method is called.
			_suffixMap, //we set this in _onInitTween() each time as a way to have a persistent variable we can use in other methods like _parse() without having to pass it around as a parameter and we keep _parse() decoupled from a particular CSSPlugin instance
			_cs, //computed style (we store this in a shared variable to conserve memory and make minification tighter
			_overwriteProps, //alias to the currently instantiating CSSPlugin's _overwriteProps array. We use this closure in order to avoid having to pass a reference around from method to method and aid in minification.
			_specialProps = {},
			p = CSSPlugin.prototype = new TweenPlugin("css");

		p.constructor = CSSPlugin;
		CSSPlugin.version = "1.19.1";
		CSSPlugin.API = 2;
		CSSPlugin.defaultTransformPerspective = 0;
		CSSPlugin.defaultSkewType = "compensated";
		CSSPlugin.defaultSmoothOrigin = true;
		p = "px"; //we'll reuse the "p" variable to keep file size down
		CSSPlugin.suffixMap = {top:p, right:p, bottom:p, left:p, width:p, height:p, fontSize:p, padding:p, margin:p, perspective:p, lineHeight:""};


		var _numExp = /(?:\-|\.|\b)(\d|\.|e\-)+/g,
			_relNumExp = /(?:\d|\-\d|\.\d|\-\.\d|\+=\d|\-=\d|\+=.\d|\-=\.\d)+/g,
			_valuesExp = /(?:\+=|\-=|\-|\b)[\d\-\.]+[a-zA-Z0-9]*(?:%|\b)/gi, //finds all the values that begin with numbers or += or -= and then a number. Includes suffixes. We use this to split complex values apart like "1px 5px 20px rgb(255,102,51)"
			_NaNExp = /(?![+-]?\d*\.?\d+|[+-]|e[+-]\d+)[^0-9]/g, //also allows scientific notation and doesn't kill the leading -/+ in -= and +=
			_suffixExp = /(?:\d|\-|\+|=|#|\.)*/g,
			_opacityExp = /opacity *= *([^)]*)/i,
			_opacityValExp = /opacity:([^;]*)/i,
			_alphaFilterExp = /alpha\(opacity *=.+?\)/i,
			_rgbhslExp = /^(rgb|hsl)/,
			_capsExp = /([A-Z])/g,
			_camelExp = /-([a-z])/gi,
			_urlExp = /(^(?:url\(\"|url\())|(?:(\"\))$|\)$)/gi, //for pulling out urls from url(...) or url("...") strings (some browsers wrap urls in quotes, some don't when reporting things like backgroundImage)
			_camelFunc = function(s, g) { return g.toUpperCase(); },
			_horizExp = /(?:Left|Right|Width)/i,
			_ieGetMatrixExp = /(M11|M12|M21|M22)=[\d\-\.e]+/gi,
			_ieSetMatrixExp = /progid\:DXImageTransform\.Microsoft\.Matrix\(.+?\)/i,
			_commasOutsideParenExp = /,(?=[^\)]*(?:\(|$))/gi, //finds any commas that are not within parenthesis
			_complexExp = /[\s,\(]/i, //for testing a string to find if it has a space, comma, or open parenthesis (clues that it's a complex value)
			_DEG2RAD = Math.PI / 180,
			_RAD2DEG = 180 / Math.PI,
			_forcePT = {},
			_dummyElement = {style:{}},
			_doc = _gsScope.document || {createElement: function() {return _dummyElement;}},
			_createElement = function(type, ns) {
				return _doc.createElementNS ? _doc.createElementNS(ns || "http://www.w3.org/1999/xhtml", type) : _doc.createElement(type);
			},
			_tempDiv = _createElement("div"),
			_tempImg = _createElement("img"),
			_internals = CSSPlugin._internals = {_specialProps:_specialProps}, //provides a hook to a few internal methods that we need to access from inside other plugins
			_agent = (_gsScope.navigator || {}).userAgent || "",
			_autoRound,
			_reqSafariFix, //we won't apply the Safari transform fix until we actually come across a tween that affects a transform property (to maintain best performance).

			_isSafari,
			_isFirefox, //Firefox has a bug that causes 3D transformed elements to randomly disappear unless a repaint is forced after each update on each element.
			_isSafariLT6, //Safari (and Android 4 which uses a flavor of Safari) has a bug that prevents changes to "top" and "left" properties from rendering properly if changed on the same frame as a transform UNLESS we set the element's WebkitBackfaceVisibility to hidden (weird, I know). Doing this for Android 3 and earlier seems to actually cause other problems, though (fun!)
			_ieVers,
			_supportsOpacity = (function() { //we set _isSafari, _ieVers, _isFirefox, and _supportsOpacity all in one function here to reduce file size slightly, especially in the minified version.
				var i = _agent.indexOf("Android"),
					a = _createElement("a");
				_isSafari = (_agent.indexOf("Safari") !== -1 && _agent.indexOf("Chrome") === -1 && (i === -1 || parseFloat(_agent.substr(i+8, 2)) > 3));
				_isSafariLT6 = (_isSafari && (parseFloat(_agent.substr(_agent.indexOf("Version/")+8, 2)) < 6));
				_isFirefox = (_agent.indexOf("Firefox") !== -1);
				if ((/MSIE ([0-9]{1,}[\.0-9]{0,})/).exec(_agent) || (/Trident\/.*rv:([0-9]{1,}[\.0-9]{0,})/).exec(_agent)) {
					_ieVers = parseFloat( RegExp.$1 );
				}
				if (!a) {
					return false;
				}
				a.style.cssText = "top:1px;opacity:.55;";
				return /^0.55/.test(a.style.opacity);
			}()),
			_getIEOpacity = function(v) {
				return (_opacityExp.test( ((typeof(v) === "string") ? v : (v.currentStyle ? v.currentStyle.filter : v.style.filter) || "") ) ? ( parseFloat( RegExp.$1 ) / 100 ) : 1);
			},
			_log = function(s) {//for logging messages, but in a way that won't throw errors in old versions of IE.
				if (_gsScope.console) {
					console.log(s);
				}
			},
			_target, //when initting a CSSPlugin, we set this variable so that we can access it from within many other functions without having to pass it around as params
			_index, //when initting a CSSPlugin, we set this variable so that we can access it from within many other functions without having to pass it around as params

			_prefixCSS = "", //the non-camelCase vendor prefix like "-o-", "-moz-", "-ms-", or "-webkit-"
			_prefix = "", //camelCase vendor prefix like "O", "ms", "Webkit", or "Moz".

			// @private feed in a camelCase property name like "transform" and it will check to see if it is valid as-is or if it needs a vendor prefix. It returns the corrected camelCase property name (i.e. "WebkitTransform" or "MozTransform" or "transform" or null if no such property is found, like if the browser is IE8 or before, "transform" won't be found at all)
			_checkPropPrefix = function(p, e) {
				e = e || _tempDiv;
				var s = e.style,
					a, i;
				if (s[p] !== undefined) {
					return p;
				}
				p = p.charAt(0).toUpperCase() + p.substr(1);
				a = ["O","Moz","ms","Ms","Webkit"];
				i = 5;
				while (--i > -1 && s[a[i]+p] === undefined) { }
				if (i >= 0) {
					_prefix = (i === 3) ? "ms" : a[i];
					_prefixCSS = "-" + _prefix.toLowerCase() + "-";
					return _prefix + p;
				}
				return null;
			},

			_getComputedStyle = _doc.defaultView ? _doc.defaultView.getComputedStyle : function() {},

			/**
			 * @private Returns the css style for a particular property of an element. For example, to get whatever the current "left" css value for an element with an ID of "myElement", you could do:
			 * var currentLeft = CSSPlugin.getStyle( document.getElementById("myElement"), "left");
			 *
			 * @param {!Object} t Target element whose style property you want to query
			 * @param {!string} p Property name (like "left" or "top" or "marginTop", etc.)
			 * @param {Object=} cs Computed style object. This just provides a way to speed processing if you're going to get several properties on the same element in quick succession - you can reuse the result of the getComputedStyle() call.
			 * @param {boolean=} calc If true, the value will not be read directly from the element's "style" property (if it exists there), but instead the getComputedStyle() result will be used. This can be useful when you want to ensure that the browser itself is interpreting the value.
			 * @param {string=} dflt Default value that should be returned in the place of null, "none", "auto" or "auto auto".
			 * @return {?string} The current property value
			 */
			_getStyle = CSSPlugin.getStyle = function(t, p, cs, calc, dflt) {
				var rv;
				if (!_supportsOpacity) if (p === "opacity") { //several versions of IE don't use the standard "opacity" property - they use things like filter:alpha(opacity=50), so we parse that here.
					return _getIEOpacity(t);
				}
				if (!calc && t.style[p]) {
					rv = t.style[p];
				} else if ((cs = cs || _getComputedStyle(t))) {
					rv = cs[p] || cs.getPropertyValue(p) || cs.getPropertyValue(p.replace(_capsExp, "-$1").toLowerCase());
				} else if (t.currentStyle) {
					rv = t.currentStyle[p];
				}
				return (dflt != null && (!rv || rv === "none" || rv === "auto" || rv === "auto auto")) ? dflt : rv;
			},

			/**
			 * @private Pass the target element, the property name, the numeric value, and the suffix (like "%", "em", "px", etc.) and it will spit back the equivalent pixel number.
			 * @param {!Object} t Target element
			 * @param {!string} p Property name (like "left", "top", "marginLeft", etc.)
			 * @param {!number} v Value
			 * @param {string=} sfx Suffix (like "px" or "%" or "em")
			 * @param {boolean=} recurse If true, the call is a recursive one. In some browsers (like IE7/8), occasionally the value isn't accurately reported initially, but if we run the function again it will take effect.
			 * @return {number} value in pixels
			 */
			_convertToPixels = _internals.convertToPixels = function(t, p, v, sfx, recurse) {
				if (sfx === "px" || !sfx) { return v; }
				if (sfx === "auto" || !v) { return 0; }
				var horiz = _horizExp.test(p),
					node = t,
					style = _tempDiv.style,
					neg = (v < 0),
					precise = (v === 1),
					pix, cache, time;
				if (neg) {
					v = -v;
				}
				if (precise) {
					v *= 100;
				}
				if (sfx === "%" && p.indexOf("border") !== -1) {
					pix = (v / 100) * (horiz ? t.clientWidth : t.clientHeight);
				} else {
					style.cssText = "border:0 solid red;position:" + _getStyle(t, "position") + ";line-height:0;";
					if (sfx === "%" || !node.appendChild || sfx.charAt(0) === "v" || sfx === "rem") {
						node = t.parentNode || _doc.body;
						cache = node._gsCache;
						time = TweenLite.ticker.frame;
						if (cache && horiz && cache.time === time) { //performance optimization: we record the width of elements along with the ticker frame so that we can quickly get it again on the same tick (seems relatively safe to assume it wouldn't change on the same tick)
							return cache.width * v / 100;
						}
						style[(horiz ? "width" : "height")] = v + sfx;
					} else {
						style[(horiz ? "borderLeftWidth" : "borderTopWidth")] = v + sfx;
					}
					node.appendChild(_tempDiv);
					pix = parseFloat(_tempDiv[(horiz ? "offsetWidth" : "offsetHeight")]);
					node.removeChild(_tempDiv);
					if (horiz && sfx === "%" && CSSPlugin.cacheWidths !== false) {
						cache = node._gsCache = node._gsCache || {};
						cache.time = time;
						cache.width = pix / v * 100;
					}
					if (pix === 0 && !recurse) {
						pix = _convertToPixels(t, p, v, sfx, true);
					}
				}
				if (precise) {
					pix /= 100;
				}
				return neg ? -pix : pix;
			},
			_calculateOffset = _internals.calculateOffset = function(t, p, cs) { //for figuring out "top" or "left" in px when it's "auto". We need to factor in margin with the offsetLeft/offsetTop
				if (_getStyle(t, "position", cs) !== "absolute") { return 0; }
				var dim = ((p === "left") ? "Left" : "Top"),
					v = _getStyle(t, "margin" + dim, cs);
				return t["offset" + dim] - (_convertToPixels(t, p, parseFloat(v), v.replace(_suffixExp, "")) || 0);
			},

			// @private returns at object containing ALL of the style properties in camelCase and their associated values.
			_getAllStyles = function(t, cs) {
				var s = {},
					i, tr, p;
				if ((cs = cs || _getComputedStyle(t, null))) {
					if ((i = cs.length)) {
						while (--i > -1) {
							p = cs[i];
							if (p.indexOf("-transform") === -1 || _transformPropCSS === p) { //Some webkit browsers duplicate transform values, one non-prefixed and one prefixed ("transform" and "WebkitTransform"), so we must weed out the extra one here.
								s[p.replace(_camelExp, _camelFunc)] = cs.getPropertyValue(p);
							}
						}
					} else { //some browsers behave differently - cs.length is always 0, so we must do a for...in loop.
						for (i in cs) {
							if (i.indexOf("Transform") === -1 || _transformProp === i) { //Some webkit browsers duplicate transform values, one non-prefixed and one prefixed ("transform" and "WebkitTransform"), so we must weed out the extra one here.
								s[i] = cs[i];
							}
						}
					}
				} else if ((cs = t.currentStyle || t.style)) {
					for (i in cs) {
						if (typeof(i) === "string" && s[i] === undefined) {
							s[i.replace(_camelExp, _camelFunc)] = cs[i];
						}
					}
				}
				if (!_supportsOpacity) {
					s.opacity = _getIEOpacity(t);
				}
				tr = _getTransform(t, cs, false);
				s.rotation = tr.rotation;
				s.skewX = tr.skewX;
				s.scaleX = tr.scaleX;
				s.scaleY = tr.scaleY;
				s.x = tr.x;
				s.y = tr.y;
				if (_supports3D) {
					s.z = tr.z;
					s.rotationX = tr.rotationX;
					s.rotationY = tr.rotationY;
					s.scaleZ = tr.scaleZ;
				}
				if (s.filters) {
					delete s.filters;
				}
				return s;
			},

			// @private analyzes two style objects (as returned by _getAllStyles()) and only looks for differences between them that contain tweenable values (like a number or color). It returns an object with a "difs" property which refers to an object containing only those isolated properties and values for tweening, and a "firstMPT" property which refers to the first MiniPropTween instance in a linked list that recorded all the starting values of the different properties so that we can revert to them at the end or beginning of the tween - we don't want the cascading to get messed up. The forceLookup parameter is an optional generic object with properties that should be forced into the results - this is necessary for className tweens that are overwriting others because imagine a scenario where a rollover/rollout adds/removes a class and the user swipes the mouse over the target SUPER fast, thus nothing actually changed yet and the subsequent comparison of the properties would indicate they match (especially when px rounding is taken into consideration), thus no tweening is necessary even though it SHOULD tween and remove those properties after the tween (otherwise the inline styles will contaminate things). See the className SpecialProp code for details.
			_cssDif = function(t, s1, s2, vars, forceLookup) {
				var difs = {},
					style = t.style,
					val, p, mpt;
				for (p in s2) {
					if (p !== "cssText") if (p !== "length") if (isNaN(p)) if (s1[p] !== (val = s2[p]) || (forceLookup && forceLookup[p])) if (p.indexOf("Origin") === -1) if (typeof(val) === "number" || typeof(val) === "string") {
						difs[p] = (val === "auto" && (p === "left" || p === "top")) ? _calculateOffset(t, p) : ((val === "" || val === "auto" || val === "none") && typeof(s1[p]) === "string" && s1[p].replace(_NaNExp, "") !== "") ? 0 : val; //if the ending value is defaulting ("" or "auto"), we check the starting value and if it can be parsed into a number (a string which could have a suffix too, like 700px), then we swap in 0 for "" or "auto" so that things actually tween.
						if (style[p] !== undefined) { //for className tweens, we must remember which properties already existed inline - the ones that didn't should be removed when the tween isn't in progress because they were only introduced to facilitate the transition between classes.
							mpt = new MiniPropTween(style, p, style[p], mpt);
						}
					}
				}
				if (vars) {
					for (p in vars) { //copy properties (except className)
						if (p !== "className") {
							difs[p] = vars[p];
						}
					}
				}
				return {difs:difs, firstMPT:mpt};
			},
			_dimensions = {width:["Left","Right"], height:["Top","Bottom"]},
			_margins = ["marginLeft","marginRight","marginTop","marginBottom"],

			/**
			 * @private Gets the width or height of an element
			 * @param {!Object} t Target element
			 * @param {!string} p Property name ("width" or "height")
			 * @param {Object=} cs Computed style object (if one exists). Just a speed optimization.
			 * @return {number} Dimension (in pixels)
			 */
			_getDimension = function(t, p, cs) {
				if ((t.nodeName + "").toLowerCase() === "svg") { //Chrome no longer supports offsetWidth/offsetHeight on SVG elements.
					return (cs || _getComputedStyle(t))[p] || 0;
				} else if (t.getCTM && _isSVG(t)) {
					return t.getBBox()[p] || 0;
				}
				var v = parseFloat((p === "width") ? t.offsetWidth : t.offsetHeight),
					a = _dimensions[p],
					i = a.length;
				cs = cs || _getComputedStyle(t, null);
				while (--i > -1) {
					v -= parseFloat( _getStyle(t, "padding" + a[i], cs, true) ) || 0;
					v -= parseFloat( _getStyle(t, "border" + a[i] + "Width", cs, true) ) || 0;
				}
				return v;
			},

			// @private Parses position-related complex strings like "top left" or "50px 10px" or "70% 20%", etc. which are used for things like transformOrigin or backgroundPosition. Optionally decorates a supplied object (recObj) with the following properties: "ox" (offsetX), "oy" (offsetY), "oxp" (if true, "ox" is a percentage not a pixel value), and "oxy" (if true, "oy" is a percentage not a pixel value)
			_parsePosition = function(v, recObj) {
				if (v === "contain" || v === "auto" || v === "auto auto") { //note: Firefox uses "auto auto" as default whereas Chrome uses "auto".
					return v + " ";
				}
				if (v == null || v === "") {
					v = "0 0";
				}
				var a = v.split(" "),
					x = (v.indexOf("left") !== -1) ? "0%" : (v.indexOf("right") !== -1) ? "100%" : a[0],
					y = (v.indexOf("top") !== -1) ? "0%" : (v.indexOf("bottom") !== -1) ? "100%" : a[1],
					i;
				if (a.length > 3 && !recObj) { //multiple positions
					a = v.split(", ").join(",").split(",");
					v = [];
					for (i = 0; i < a.length; i++) {
						v.push(_parsePosition(a[i]));
					}
					return v.join(",");
				}
				if (y == null) {
					y = (x === "center") ? "50%" : "0";
				} else if (y === "center") {
					y = "50%";
				}
				if (x === "center" || (isNaN(parseFloat(x)) && (x + "").indexOf("=") === -1)) { //remember, the user could flip-flop the values and say "bottom center" or "center bottom", etc. "center" is ambiguous because it could be used to describe horizontal or vertical, hence the isNaN(). If there's an "=" sign in the value, it's relative.
					x = "50%";
				}
				v = x + " " + y + ((a.length > 2) ? " " + a[2] : "");
				if (recObj) {
					recObj.oxp = (x.indexOf("%") !== -1);
					recObj.oyp = (y.indexOf("%") !== -1);
					recObj.oxr = (x.charAt(1) === "=");
					recObj.oyr = (y.charAt(1) === "=");
					recObj.ox = parseFloat(x.replace(_NaNExp, ""));
					recObj.oy = parseFloat(y.replace(_NaNExp, ""));
					recObj.v = v;
				}
				return recObj || v;
			},

			/**
			 * @private Takes an ending value (typically a string, but can be a number) and a starting value and returns the change between the two, looking for relative value indicators like += and -= and it also ignores suffixes (but make sure the ending value starts with a number or +=/-= and that the starting value is a NUMBER!)
			 * @param {(number|string)} e End value which is typically a string, but could be a number
			 * @param {(number|string)} b Beginning value which is typically a string but could be a number
			 * @return {number} Amount of change between the beginning and ending values (relative values that have a "+=" or "-=" are recognized)
			 */
			_parseChange = function(e, b) {
				if (typeof(e) === "function") {
					e = e(_index, _target);
				}
				return (typeof(e) === "string" && e.charAt(1) === "=") ? parseInt(e.charAt(0) + "1", 10) * parseFloat(e.substr(2)) : (parseFloat(e) - parseFloat(b)) || 0;
			},

			/**
			 * @private Takes a value and a default number, checks if the value is relative, null, or numeric and spits back a normalized number accordingly. Primarily used in the _parseTransform() function.
			 * @param {Object} v Value to be parsed
			 * @param {!number} d Default value (which is also used for relative calculations if "+=" or "-=" is found in the first parameter)
			 * @return {number} Parsed value
			 */
			_parseVal = function(v, d) {
				if (typeof(v) === "function") {
					v = v(_index, _target);
				}
				return (v == null) ? d : (typeof(v) === "string" && v.charAt(1) === "=") ? parseInt(v.charAt(0) + "1", 10) * parseFloat(v.substr(2)) + d : parseFloat(v) || 0;
			},

			/**
			 * @private Translates strings like "40deg" or "40" or 40rad" or "+=40deg" or "270_short" or "-90_cw" or "+=45_ccw" to a numeric radian angle. Of course a starting/default value must be fed in too so that relative values can be calculated properly.
			 * @param {Object} v Value to be parsed
			 * @param {!number} d Default value (which is also used for relative calculations if "+=" or "-=" is found in the first parameter)
			 * @param {string=} p property name for directionalEnd (optional - only used when the parsed value is directional ("_short", "_cw", or "_ccw" suffix). We need a way to store the uncompensated value so that at the end of the tween, we set it to exactly what was requested with no directional compensation). Property name would be "rotation", "rotationX", or "rotationY"
			 * @param {Object=} directionalEnd An object that will store the raw end values for directional angles ("_short", "_cw", or "_ccw" suffix). We need a way to store the uncompensated value so that at the end of the tween, we set it to exactly what was requested with no directional compensation.
			 * @return {number} parsed angle in radians
			 */
			_parseAngle = function(v, d, p, directionalEnd) {
				var min = 0.000001,
					cap, split, dif, result, isRelative;
				if (typeof(v) === "function") {
					v = v(_index, _target);
				}
				if (v == null) {
					result = d;
				} else if (typeof(v) === "number") {
					result = v;
				} else {
					cap = 360;
					split = v.split("_");
					isRelative = (v.charAt(1) === "=");
					dif = (isRelative ? parseInt(v.charAt(0) + "1", 10) * parseFloat(split[0].substr(2)) : parseFloat(split[0])) * ((v.indexOf("rad") === -1) ? 1 : _RAD2DEG) - (isRelative ? 0 : d);
					if (split.length) {
						if (directionalEnd) {
							directionalEnd[p] = d + dif;
						}
						if (v.indexOf("short") !== -1) {
							dif = dif % cap;
							if (dif !== dif % (cap / 2)) {
								dif = (dif < 0) ? dif + cap : dif - cap;
							}
						}
						if (v.indexOf("_cw") !== -1 && dif < 0) {
							dif = ((dif + cap * 9999999999) % cap) - ((dif / cap) | 0) * cap;
						} else if (v.indexOf("ccw") !== -1 && dif > 0) {
							dif = ((dif - cap * 9999999999) % cap) - ((dif / cap) | 0) * cap;
						}
					}
					result = d + dif;
				}
				if (result < min && result > -min) {
					result = 0;
				}
				return result;
			},

			_colorLookup = {aqua:[0,255,255],
				lime:[0,255,0],
				silver:[192,192,192],
				black:[0,0,0],
				maroon:[128,0,0],
				teal:[0,128,128],
				blue:[0,0,255],
				navy:[0,0,128],
				white:[255,255,255],
				fuchsia:[255,0,255],
				olive:[128,128,0],
				yellow:[255,255,0],
				orange:[255,165,0],
				gray:[128,128,128],
				purple:[128,0,128],
				green:[0,128,0],
				red:[255,0,0],
				pink:[255,192,203],
				cyan:[0,255,255],
				transparent:[255,255,255,0]},

			_hue = function(h, m1, m2) {
				h = (h < 0) ? h + 1 : (h > 1) ? h - 1 : h;
				return ((((h * 6 < 1) ? m1 + (m2 - m1) * h * 6 : (h < 0.5) ? m2 : (h * 3 < 2) ? m1 + (m2 - m1) * (2 / 3 - h) * 6 : m1) * 255) + 0.5) | 0;
			},

			/**
			 * @private Parses a color (like #9F0, #FF9900, rgb(255,51,153) or hsl(108, 50%, 10%)) into an array with 3 elements for red, green, and blue or if toHSL parameter is true, it will populate the array with hue, saturation, and lightness values. If a relative value is found in an hsl() or hsla() string, it will preserve those relative prefixes and all the values in the array will be strings instead of numbers (in all other cases it will be populated with numbers).
			 * @param {(string|number)} v The value the should be parsed which could be a string like #9F0 or rgb(255,102,51) or rgba(255,0,0,0.5) or it could be a number like 0xFF00CC or even a named color like red, blue, purple, etc.
			 * @param {(boolean)} toHSL If true, an hsl() or hsla() value will be returned instead of rgb() or rgba()
			 * @return {Array.<number>} An array containing red, green, and blue (and optionally alpha) in that order, or if the toHSL parameter was true, the array will contain hue, saturation and lightness (and optionally alpha) in that order. Always numbers unless there's a relative prefix found in an hsl() or hsla() string and toHSL is true.
			 */
			_parseColor = CSSPlugin.parseColor = function(v, toHSL) {
				var a, r, g, b, h, s, l, max, min, d, wasHSL;
				if (!v) {
					a = _colorLookup.black;
				} else if (typeof(v) === "number") {
					a = [v >> 16, (v >> 8) & 255, v & 255];
				} else {
					if (v.charAt(v.length - 1) === ",") { //sometimes a trailing comma is included and we should chop it off (typically from a comma-delimited list of values like a textShadow:"2px 2px 2px blue, 5px 5px 5px rgb(255,0,0)" - in this example "blue," has a trailing comma. We could strip it out inside parseComplex() but we'd need to do it to the beginning and ending values plus it wouldn't provide protection from other potential scenarios like if the user passes in a similar value.
						v = v.substr(0, v.length - 1);
					}
					if (_colorLookup[v]) {
						a = _colorLookup[v];
					} else if (v.charAt(0) === "#") {
						if (v.length === 4) { //for shorthand like #9F0
							r = v.charAt(1);
							g = v.charAt(2);
							b = v.charAt(3);
							v = "#" + r + r + g + g + b + b;
						}
						v = parseInt(v.substr(1), 16);
						a = [v >> 16, (v >> 8) & 255, v & 255];
					} else if (v.substr(0, 3) === "hsl") {
						a = wasHSL = v.match(_numExp);
						if (!toHSL) {
							h = (Number(a[0]) % 360) / 360;
							s = Number(a[1]) / 100;
							l = Number(a[2]) / 100;
							g = (l <= 0.5) ? l * (s + 1) : l + s - l * s;
							r = l * 2 - g;
							if (a.length > 3) {
								a[3] = Number(v[3]);
							}
							a[0] = _hue(h + 1 / 3, r, g);
							a[1] = _hue(h, r, g);
							a[2] = _hue(h - 1 / 3, r, g);
						} else if (v.indexOf("=") !== -1) { //if relative values are found, just return the raw strings with the relative prefixes in place.
							return v.match(_relNumExp);
						}
					} else {
						a = v.match(_numExp) || _colorLookup.transparent;
					}
					a[0] = Number(a[0]);
					a[1] = Number(a[1]);
					a[2] = Number(a[2]);
					if (a.length > 3) {
						a[3] = Number(a[3]);
					}
				}
				if (toHSL && !wasHSL) {
					r = a[0] / 255;
					g = a[1] / 255;
					b = a[2] / 255;
					max = Math.max(r, g, b);
					min = Math.min(r, g, b);
					l = (max + min) / 2;
					if (max === min) {
						h = s = 0;
					} else {
						d = max - min;
						s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
						h = (max === r) ? (g - b) / d + (g < b ? 6 : 0) : (max === g) ? (b - r) / d + 2 : (r - g) / d + 4;
						h *= 60;
					}
					a[0] = (h + 0.5) | 0;
					a[1] = (s * 100 + 0.5) | 0;
					a[2] = (l * 100 + 0.5) | 0;
				}
				return a;
			},
			_formatColors = function(s, toHSL) {
				var colors = s.match(_colorExp) || [],
					charIndex = 0,
					parsed = colors.length ? "" : s,
					i, color, temp;
				for (i = 0; i < colors.length; i++) {
					color = colors[i];
					temp = s.substr(charIndex, s.indexOf(color, charIndex)-charIndex);
					charIndex += temp.length + color.length;
					color = _parseColor(color, toHSL);
					if (color.length === 3) {
						color.push(1);
					}
					parsed += temp + (toHSL ? "hsla(" + color[0] + "," + color[1] + "%," + color[2] + "%," + color[3] : "rgba(" + color.join(",")) + ")";
				}
				return parsed + s.substr(charIndex);
			},
			_colorExp = "(?:\\b(?:(?:rgb|rgba|hsl|hsla)\\(.+?\\))|\\B#(?:[0-9a-f]{3}){1,2}\\b"; //we'll dynamically build this Regular Expression to conserve file size. After building it, it will be able to find rgb(), rgba(), # (hexadecimal), and named color values like red, blue, purple, etc.

		for (p in _colorLookup) {
			_colorExp += "|" + p + "\\b";
		}
		_colorExp = new RegExp(_colorExp+")", "gi");

		CSSPlugin.colorStringFilter = function(a) {
			var combined = a[0] + a[1],
				toHSL;
			if (_colorExp.test(combined)) {
				toHSL = (combined.indexOf("hsl(") !== -1 || combined.indexOf("hsla(") !== -1);
				a[0] = _formatColors(a[0], toHSL);
				a[1] = _formatColors(a[1], toHSL);
			}
			_colorExp.lastIndex = 0;
		};

		if (!TweenLite.defaultStringFilter) {
			TweenLite.defaultStringFilter = CSSPlugin.colorStringFilter;
		}

		/**
		 * @private Returns a formatter function that handles taking a string (or number in some cases) and returning a consistently formatted one in terms of delimiters, quantity of values, etc. For example, we may get boxShadow values defined as "0px red" or "0px 0px 10px rgb(255,0,0)" or "0px 0px 20px 20px #F00" and we need to ensure that what we get back is described with 4 numbers and a color. This allows us to feed it into the _parseComplex() method and split the values up appropriately. The neat thing about this _getFormatter() function is that the dflt defines a pattern as well as a default, so for example, _getFormatter("0px 0px 0px 0px #777", true) not only sets the default as 0px for all distances and #777 for the color, but also sets the pattern such that 4 numbers and a color will always get returned.
		 * @param {!string} dflt The default value and pattern to follow. So "0px 0px 0px 0px #777" will ensure that 4 numbers and a color will always get returned.
		 * @param {boolean=} clr If true, the values should be searched for color-related data. For example, boxShadow values typically contain a color whereas borderRadius don't.
		 * @param {boolean=} collapsible If true, the value is a top/left/right/bottom style one that acts like margin or padding, where if only one value is received, it's used for all 4; if 2 are received, the first is duplicated for 3rd (bottom) and the 2nd is duplicated for the 4th spot (left), etc.
		 * @return {Function} formatter function
		 */
		var _getFormatter = function(dflt, clr, collapsible, multi) {
				if (dflt == null) {
					return function(v) {return v;};
				}
				var dColor = clr ? (dflt.match(_colorExp) || [""])[0] : "",
					dVals = dflt.split(dColor).join("").match(_valuesExp) || [],
					pfx = dflt.substr(0, dflt.indexOf(dVals[0])),
					sfx = (dflt.charAt(dflt.length - 1) === ")") ? ")" : "",
					delim = (dflt.indexOf(" ") !== -1) ? " " : ",",
					numVals = dVals.length,
					dSfx = (numVals > 0) ? dVals[0].replace(_numExp, "") : "",
					formatter;
				if (!numVals) {
					return function(v) {return v;};
				}
				if (clr) {
					formatter = function(v) {
						var color, vals, i, a;
						if (typeof(v) === "number") {
							v += dSfx;
						} else if (multi && _commasOutsideParenExp.test(v)) {
							a = v.replace(_commasOutsideParenExp, "|").split("|");
							for (i = 0; i < a.length; i++) {
								a[i] = formatter(a[i]);
							}
							return a.join(",");
						}
						color = (v.match(_colorExp) || [dColor])[0];
						vals = v.split(color).join("").match(_valuesExp) || [];
						i = vals.length;
						if (numVals > i--) {
							while (++i < numVals) {
								vals[i] = collapsible ? vals[(((i - 1) / 2) | 0)] : dVals[i];
							}
						}
						return pfx + vals.join(delim) + delim + color + sfx + (v.indexOf("inset") !== -1 ? " inset" : "");
					};
					return formatter;

				}
				formatter = function(v) {
					var vals, a, i;
					if (typeof(v) === "number") {
						v += dSfx;
					} else if (multi && _commasOutsideParenExp.test(v)) {
						a = v.replace(_commasOutsideParenExp, "|").split("|");
						for (i = 0; i < a.length; i++) {
							a[i] = formatter(a[i]);
						}
						return a.join(",");
					}
					vals = v.match(_valuesExp) || [];
					i = vals.length;
					if (numVals > i--) {
						while (++i < numVals) {
							vals[i] = collapsible ? vals[(((i - 1) / 2) | 0)] : dVals[i];
						}
					}
					return pfx + vals.join(delim) + sfx;
				};
				return formatter;
			},

			/**
			 * @private returns a formatter function that's used for edge-related values like marginTop, marginLeft, paddingBottom, paddingRight, etc. Just pass a comma-delimited list of property names related to the edges.
			 * @param {!string} props a comma-delimited list of property names in order from top to left, like "marginTop,marginRight,marginBottom,marginLeft"
			 * @return {Function} a formatter function
			 */
			_getEdgeParser = function(props) {
				props = props.split(",");
				return function(t, e, p, cssp, pt, plugin, vars) {
					var a = (e + "").split(" "),
						i;
					vars = {};
					for (i = 0; i < 4; i++) {
						vars[props[i]] = a[i] = a[i] || a[(((i - 1) / 2) >> 0)];
					}
					return cssp.parse(t, vars, pt, plugin);
				};
			},

			// @private used when other plugins must tween values first, like BezierPlugin or ThrowPropsPlugin, etc. That plugin's setRatio() gets called first so that the values are updated, and then we loop through the MiniPropTweens which handle copying the values into their appropriate slots so that they can then be applied correctly in the main CSSPlugin setRatio() method. Remember, we typically create a proxy object that has a bunch of uniquely-named properties that we feed to the sub-plugin and it does its magic normally, and then we must interpret those values and apply them to the css because often numbers must get combined/concatenated, suffixes added, etc. to work with css, like boxShadow could have 4 values plus a color.
			_setPluginRatio = _internals._setPluginRatio = function(v) {
				this.plugin.setRatio(v);
				var d = this.data,
					proxy = d.proxy,
					mpt = d.firstMPT,
					min = 0.000001,
					val, pt, i, str, p;
				while (mpt) {
					val = proxy[mpt.v];
					if (mpt.r) {
						val = Math.round(val);
					} else if (val < min && val > -min) {
						val = 0;
					}
					mpt.t[mpt.p] = val;
					mpt = mpt._next;
				}
				if (d.autoRotate) {
					d.autoRotate.rotation = d.mod ? d.mod(proxy.rotation, this.t) : proxy.rotation; //special case for ModifyPlugin to hook into an auto-rotating bezier
				}
				//at the end, we must set the CSSPropTween's "e" (end) value dynamically here because that's what is used in the final setRatio() method. Same for "b" at the beginning.
				if (v === 1 || v === 0) {
					mpt = d.firstMPT;
					p = (v === 1) ? "e" : "b";
					while (mpt) {
						pt = mpt.t;
						if (!pt.type) {
							pt[p] = pt.s + pt.xs0;
						} else if (pt.type === 1) {
							str = pt.xs0 + pt.s + pt.xs1;
							for (i = 1; i < pt.l; i++) {
								str += pt["xn"+i] + pt["xs"+(i+1)];
							}
							pt[p] = str;
						}
						mpt = mpt._next;
					}
				}
			},

			/**
			 * @private @constructor Used by a few SpecialProps to hold important values for proxies. For example, _parseToProxy() creates a MiniPropTween instance for each property that must get tweened on the proxy, and we record the original property name as well as the unique one we create for the proxy, plus whether or not the value needs to be rounded plus the original value.
			 * @param {!Object} t target object whose property we're tweening (often a CSSPropTween)
			 * @param {!string} p property name
			 * @param {(number|string|object)} v value
			 * @param {MiniPropTween=} next next MiniPropTween in the linked list
			 * @param {boolean=} r if true, the tweened value should be rounded to the nearest integer
			 */
			MiniPropTween = function(t, p, v, next, r) {
				this.t = t;
				this.p = p;
				this.v = v;
				this.r = r;
				if (next) {
					next._prev = this;
					this._next = next;
				}
			},

			/**
			 * @private Most other plugins (like BezierPlugin and ThrowPropsPlugin and others) can only tween numeric values, but CSSPlugin must accommodate special values that have a bunch of extra data (like a suffix or strings between numeric values, etc.). For example, boxShadow has values like "10px 10px 20px 30px rgb(255,0,0)" which would utterly confuse other plugins. This method allows us to split that data apart and grab only the numeric data and attach it to uniquely-named properties of a generic proxy object ({}) so that we can feed that to virtually any plugin to have the numbers tweened. However, we must also keep track of which properties from the proxy go with which CSSPropTween values and instances. So we create a linked list of MiniPropTweens. Each one records a target (the original CSSPropTween), property (like "s" or "xn1" or "xn2") that we're tweening and the unique property name that was used for the proxy (like "boxShadow_xn1" and "boxShadow_xn2") and whether or not they need to be rounded. That way, in the _setPluginRatio() method we can simply copy the values over from the proxy to the CSSPropTween instance(s). Then, when the main CSSPlugin setRatio() method runs and applies the CSSPropTween values accordingly, they're updated nicely. So the external plugin tweens the numbers, _setPluginRatio() copies them over, and setRatio() acts normally, applying css-specific values to the element.
			 * This method returns an object that has the following properties:
			 *  - proxy: a generic object containing the starting values for all the properties that will be tweened by the external plugin.  This is what we feed to the external _onInitTween() as the target
			 *  - end: a generic object containing the ending values for all the properties that will be tweened by the external plugin. This is what we feed to the external plugin's _onInitTween() as the destination values
			 *  - firstMPT: the first MiniPropTween in the linked list
			 *  - pt: the first CSSPropTween in the linked list that was created when parsing. If shallow is true, this linked list will NOT attach to the one passed into the _parseToProxy() as the "pt" (4th) parameter.
			 * @param {!Object} t target object to be tweened
			 * @param {!(Object|string)} vars the object containing the information about the tweening values (typically the end/destination values) that should be parsed
			 * @param {!CSSPlugin} cssp The CSSPlugin instance
			 * @param {CSSPropTween=} pt the next CSSPropTween in the linked list
			 * @param {TweenPlugin=} plugin the external TweenPlugin instance that will be handling tweening the numeric values
			 * @param {boolean=} shallow if true, the resulting linked list from the parse will NOT be attached to the CSSPropTween that was passed in as the "pt" (4th) parameter.
			 * @return An object containing the following properties: proxy, end, firstMPT, and pt (see above for descriptions)
			 */
			_parseToProxy = _internals._parseToProxy = function(t, vars, cssp, pt, plugin, shallow) {
				var bpt = pt,
					start = {},
					end = {},
					transform = cssp._transform,
					oldForce = _forcePT,
					i, p, xp, mpt, firstPT;
				cssp._transform = null;
				_forcePT = vars;
				pt = firstPT = cssp.parse(t, vars, pt, plugin);
				_forcePT = oldForce;
				//break off from the linked list so the new ones are isolated.
				if (shallow) {
					cssp._transform = transform;
					if (bpt) {
						bpt._prev = null;
						if (bpt._prev) {
							bpt._prev._next = null;
						}
					}
				}
				while (pt && pt !== bpt) {
					if (pt.type <= 1) {
						p = pt.p;
						end[p] = pt.s + pt.c;
						start[p] = pt.s;
						if (!shallow) {
							mpt = new MiniPropTween(pt, "s", p, mpt, pt.r);
							pt.c = 0;
						}
						if (pt.type === 1) {
							i = pt.l;
							while (--i > 0) {
								xp = "xn" + i;
								p = pt.p + "_" + xp;
								end[p] = pt.data[xp];
								start[p] = pt[xp];
								if (!shallow) {
									mpt = new MiniPropTween(pt, xp, p, mpt, pt.rxp[xp]);
								}
							}
						}
					}
					pt = pt._next;
				}
				return {proxy:start, end:end, firstMPT:mpt, pt:firstPT};
			},



			/**
			 * @constructor Each property that is tweened has at least one CSSPropTween associated with it. These instances store important information like the target, property, starting value, amount of change, etc. They can also optionally have a number of "extra" strings and numeric values named xs1, xn1, xs2, xn2, xs3, xn3, etc. where "s" indicates string and "n" indicates number. These can be pieced together in a complex-value tween (type:1) that has alternating types of data like a string, number, string, number, etc. For example, boxShadow could be "5px 5px 8px rgb(102, 102, 51)". In that value, there are 6 numbers that may need to tween and then pieced back together into a string again with spaces, suffixes, etc. xs0 is special in that it stores the suffix for standard (type:0) tweens, -OR- the first string (prefix) in a complex-value (type:1) CSSPropTween -OR- it can be the non-tweening value in a type:-1 CSSPropTween. We do this to conserve memory.
			 * CSSPropTweens have the following optional properties as well (not defined through the constructor):
			 *  - l: Length in terms of the number of extra properties that the CSSPropTween has (default: 0). For example, for a boxShadow we may need to tween 5 numbers in which case l would be 5; Keep in mind that the start/end values for the first number that's tweened are always stored in the s and c properties to conserve memory. All additional values thereafter are stored in xn1, xn2, etc.
			 *  - xfirst: The first instance of any sub-CSSPropTweens that are tweening properties of this instance. For example, we may split up a boxShadow tween so that there's a main CSSPropTween of type:1 that has various xs* and xn* values associated with the h-shadow, v-shadow, blur, color, etc. Then we spawn a CSSPropTween for each of those that has a higher priority and runs BEFORE the main CSSPropTween so that the values are all set by the time it needs to re-assemble them. The xfirst gives us an easy way to identify the first one in that chain which typically ends at the main one (because they're all prepende to the linked list)
			 *  - plugin: The TweenPlugin instance that will handle the tweening of any complex values. For example, sometimes we don't want to use normal subtweens (like xfirst refers to) to tween the values - we might want ThrowPropsPlugin or BezierPlugin some other plugin to do the actual tweening, so we create a plugin instance and store a reference here. We need this reference so that if we get a request to round values or disable a tween, we can pass along that request.
			 *  - data: Arbitrary data that needs to be stored with the CSSPropTween. Typically if we're going to have a plugin handle the tweening of a complex-value tween, we create a generic object that stores the END values that we're tweening to and the CSSPropTween's xs1, xs2, etc. have the starting values. We store that object as data. That way, we can simply pass that object to the plugin and use the CSSPropTween as the target.
			 *  - setRatio: Only used for type:2 tweens that require custom functionality. In this case, we call the CSSPropTween's setRatio() method and pass the ratio each time the tween updates. This isn't quite as efficient as doing things directly in the CSSPlugin's setRatio() method, but it's very convenient and flexible.
			 * @param {!Object} t Target object whose property will be tweened. Often a DOM element, but not always. It could be anything.
			 * @param {string} p Property to tween (name). For example, to tween element.width, p would be "width".
			 * @param {number} s Starting numeric value
			 * @param {number} c Change in numeric value over the course of the entire tween. For example, if element.width starts at 5 and should end at 100, c would be 95.
			 * @param {CSSPropTween=} next The next CSSPropTween in the linked list. If one is defined, we will define its _prev as the new instance, and the new instance's _next will be pointed at it.
			 * @param {number=} type The type of CSSPropTween where -1 = a non-tweening value, 0 = a standard simple tween, 1 = a complex value (like one that has multiple numbers in a comma- or space-delimited string like border:"1px solid red"), and 2 = one that uses a custom setRatio function that does all of the work of applying the values on each update.
			 * @param {string=} n Name of the property that should be used for overwriting purposes which is typically the same as p but not always. For example, we may need to create a subtween for the 2nd part of a "clip:rect(...)" tween in which case "p" might be xs1 but "n" is still "clip"
			 * @param {boolean=} r If true, the value(s) should be rounded
			 * @param {number=} pr Priority in the linked list order. Higher priority CSSPropTweens will be updated before lower priority ones. The default priority is 0.
			 * @param {string=} b Beginning value. We store this to ensure that it is EXACTLY what it was when the tween began without any risk of interpretation issues.
			 * @param {string=} e Ending value. We store this to ensure that it is EXACTLY what the user defined at the end of the tween without any risk of interpretation issues.
			 */
			CSSPropTween = _internals.CSSPropTween = function(t, p, s, c, next, type, n, r, pr, b, e) {
				this.t = t; //target
				this.p = p; //property
				this.s = s; //starting value
				this.c = c; //change value
				this.n = n || p; //name that this CSSPropTween should be associated to (usually the same as p, but not always - n is what overwriting looks at)
				if (!(t instanceof CSSPropTween)) {
					_overwriteProps.push(this.n);
				}
				this.r = r; //round (boolean)
				this.type = type || 0; //0 = normal tween, -1 = non-tweening (in which case xs0 will be applied to the target's property, like tp.t[tp.p] = tp.xs0), 1 = complex-value SpecialProp, 2 = custom setRatio() that does all the work
				if (pr) {
					this.pr = pr;
					_hasPriority = true;
				}
				this.b = (b === undefined) ? s : b;
				this.e = (e === undefined) ? s + c : e;
				if (next) {
					this._next = next;
					next._prev = this;
				}
			},

			_addNonTweeningNumericPT = function(target, prop, start, end, next, overwriteProp) { //cleans up some code redundancies and helps minification. Just a fast way to add a NUMERIC non-tweening CSSPropTween
				var pt = new CSSPropTween(target, prop, start, end - start, next, -1, overwriteProp);
				pt.b = start;
				pt.e = pt.xs0 = end;
				return pt;
			},

			/**
			 * Takes a target, the beginning value and ending value (as strings) and parses them into a CSSPropTween (possibly with child CSSPropTweens) that accommodates multiple numbers, colors, comma-delimited values, etc. For example:
			 * sp.parseComplex(element, "boxShadow", "5px 10px 20px rgb(255,102,51)", "0px 0px 0px red", true, "0px 0px 0px rgb(0,0,0,0)", pt);
			 * It will walk through the beginning and ending values (which should be in the same format with the same number and type of values) and figure out which parts are numbers, what strings separate the numeric/tweenable values, and then create the CSSPropTweens accordingly. If a plugin is defined, no child CSSPropTweens will be created. Instead, the ending values will be stored in the "data" property of the returned CSSPropTween like: {s:-5, xn1:-10, xn2:-20, xn3:255, xn4:0, xn5:0} so that it can be fed to any other plugin and it'll be plain numeric tweens but the recomposition of the complex value will be handled inside CSSPlugin's setRatio().
			 * If a setRatio is defined, the type of the CSSPropTween will be set to 2 and recomposition of the values will be the responsibility of that method.
			 *
			 * @param {!Object} t Target whose property will be tweened
			 * @param {!string} p Property that will be tweened (its name, like "left" or "backgroundColor" or "boxShadow")
			 * @param {string} b Beginning value
			 * @param {string} e Ending value
			 * @param {boolean} clrs If true, the value could contain a color value like "rgb(255,0,0)" or "#F00" or "red". The default is false, so no colors will be recognized (a performance optimization)
			 * @param {(string|number|Object)} dflt The default beginning value that should be used if no valid beginning value is defined or if the number of values inside the complex beginning and ending values don't match
			 * @param {?CSSPropTween} pt CSSPropTween instance that is the current head of the linked list (we'll prepend to this).
			 * @param {number=} pr Priority in the linked list order. Higher priority properties will be updated before lower priority ones. The default priority is 0.
			 * @param {TweenPlugin=} plugin If a plugin should handle the tweening of extra properties, pass the plugin instance here. If one is defined, then NO subtweens will be created for any extra properties (the properties will be created - just not additional CSSPropTween instances to tween them) because the plugin is expected to do so. However, the end values WILL be populated in the "data" property, like {s:100, xn1:50, xn2:300}
			 * @param {function(number)=} setRatio If values should be set in a custom function instead of being pieced together in a type:1 (complex-value) CSSPropTween, define that custom function here.
			 * @return {CSSPropTween} The first CSSPropTween in the linked list which includes the new one(s) added by the parseComplex() call.
			 */
			_parseComplex = CSSPlugin.parseComplex = function(t, p, b, e, clrs, dflt, pt, pr, plugin, setRatio) {
				//DEBUG: _log("parseComplex: "+p+", b: "+b+", e: "+e);
				b = b || dflt || "";
				if (typeof(e) === "function") {
					e = e(_index, _target);
				}
				pt = new CSSPropTween(t, p, 0, 0, pt, (setRatio ? 2 : 1), null, false, pr, b, e);
				e += ""; //ensures it's a string
				if (clrs && _colorExp.test(e + b)) { //if colors are found, normalize the formatting to rgba() or hsla().
					e = [b, e];
					CSSPlugin.colorStringFilter(e);
					b = e[0];
					e = e[1];
				}
				var ba = b.split(", ").join(",").split(" "), //beginning array
					ea = e.split(", ").join(",").split(" "), //ending array
					l = ba.length,
					autoRound = (_autoRound !== false),
					i, xi, ni, bv, ev, bnums, enums, bn, hasAlpha, temp, cv, str, useHSL;
				if (e.indexOf(",") !== -1 || b.indexOf(",") !== -1) {
					ba = ba.join(" ").replace(_commasOutsideParenExp, ", ").split(" ");
					ea = ea.join(" ").replace(_commasOutsideParenExp, ", ").split(" ");
					l = ba.length;
				}
				if (l !== ea.length) {
					//DEBUG: _log("mismatched formatting detected on " + p + " (" + b + " vs " + e + ")");
					ba = (dflt || "").split(" ");
					l = ba.length;
				}
				pt.plugin = plugin;
				pt.setRatio = setRatio;
				_colorExp.lastIndex = 0;
				for (i = 0; i < l; i++) {
					bv = ba[i];
					ev = ea[i];
					bn = parseFloat(bv);
					//if the value begins with a number (most common). It's fine if it has a suffix like px
					if (bn || bn === 0) {
						pt.appendXtra("", bn, _parseChange(ev, bn), ev.replace(_relNumExp, ""), (autoRound && ev.indexOf("px") !== -1), true);

					//if the value is a color
					} else if (clrs && _colorExp.test(bv)) {
						str = ev.indexOf(")") + 1;
						str = ")" + (str ? ev.substr(str) : ""); //if there's a comma or ) at the end, retain it.
						useHSL = (ev.indexOf("hsl") !== -1 && _supportsOpacity);
						bv = _parseColor(bv, useHSL);
						ev = _parseColor(ev, useHSL);
						hasAlpha = (bv.length + ev.length > 6);
						if (hasAlpha && !_supportsOpacity && ev[3] === 0) { //older versions of IE don't support rgba(), so if the destination alpha is 0, just use "transparent" for the end color
							pt["xs" + pt.l] += pt.l ? " transparent" : "transparent";
							pt.e = pt.e.split(ea[i]).join("transparent");
						} else {
							if (!_supportsOpacity) { //old versions of IE don't support rgba().
								hasAlpha = false;
							}
							if (useHSL) {
								pt.appendXtra((hasAlpha ? "hsla(" : "hsl("), bv[0], _parseChange(ev[0], bv[0]), ",", false, true)
									.appendXtra("", bv[1], _parseChange(ev[1], bv[1]), "%,", false)
									.appendXtra("", bv[2], _parseChange(ev[2], bv[2]), (hasAlpha ? "%," : "%" + str), false);
							} else {
								pt.appendXtra((hasAlpha ? "rgba(" : "rgb("), bv[0], ev[0] - bv[0], ",", true, true)
									.appendXtra("", bv[1], ev[1] - bv[1], ",", true)
									.appendXtra("", bv[2], ev[2] - bv[2], (hasAlpha ? "," : str), true);
							}

							if (hasAlpha) {
								bv = (bv.length < 4) ? 1 : bv[3];
								pt.appendXtra("", bv, ((ev.length < 4) ? 1 : ev[3]) - bv, str, false);
							}
						}
						_colorExp.lastIndex = 0; //otherwise the test() on the RegExp could move the lastIndex and taint future results.

					} else {
						bnums = bv.match(_numExp); //gets each group of numbers in the beginning value string and drops them into an array

						//if no number is found, treat it as a non-tweening value and just append the string to the current xs.
						if (!bnums) {
							pt["xs" + pt.l] += (pt.l || pt["xs" + pt.l]) ? " " + ev : ev;

						//loop through all the numbers that are found and construct the extra values on the pt.
						} else {
							enums = ev.match(_relNumExp); //get each group of numbers in the end value string and drop them into an array. We allow relative values too, like +=50 or -=.5
							if (!enums || enums.length !== bnums.length) {
								//DEBUG: _log("mismatched formatting detected on " + p + " (" + b + " vs " + e + ")");
								return pt;
							}
							ni = 0;
							for (xi = 0; xi < bnums.length; xi++) {
								cv = bnums[xi];
								temp = bv.indexOf(cv, ni);
								pt.appendXtra(bv.substr(ni, temp - ni), Number(cv), _parseChange(enums[xi], cv), "", (autoRound && bv.substr(temp + cv.length, 2) === "px"), (xi === 0));
								ni = temp + cv.length;
							}
							pt["xs" + pt.l] += bv.substr(ni);
						}
					}
				}
				//if there are relative values ("+=" or "-=" prefix), we need to adjust the ending value to eliminate the prefixes and combine the values properly.
				if (e.indexOf("=") !== -1) if (pt.data) {
					str = pt.xs0 + pt.data.s;
					for (i = 1; i < pt.l; i++) {
						str += pt["xs" + i] + pt.data["xn" + i];
					}
					pt.e = str + pt["xs" + i];
				}
				if (!pt.l) {
					pt.type = -1;
					pt.xs0 = pt.e;
				}
				return pt.xfirst || pt;
			},
			i = 9;


		p = CSSPropTween.prototype;
		p.l = p.pr = 0; //length (number of extra properties like xn1, xn2, xn3, etc.
		while (--i > 0) {
			p["xn" + i] = 0;
			p["xs" + i] = "";
		}
		p.xs0 = "";
		p._next = p._prev = p.xfirst = p.data = p.plugin = p.setRatio = p.rxp = null;


		/**
		 * Appends and extra tweening value to a CSSPropTween and automatically manages any prefix and suffix strings. The first extra value is stored in the s and c of the main CSSPropTween instance, but thereafter any extras are stored in the xn1, xn2, xn3, etc. The prefixes and suffixes are stored in the xs0, xs1, xs2, etc. properties. For example, if I walk through a clip value like "rect(10px, 5px, 0px, 20px)", the values would be stored like this:
		 * xs0:"rect(", s:10, xs1:"px, ", xn1:5, xs2:"px, ", xn2:0, xs3:"px, ", xn3:20, xn4:"px)"
		 * And they'd all get joined together when the CSSPlugin renders (in the setRatio() method).
		 * @param {string=} pfx Prefix (if any)
		 * @param {!number} s Starting value
		 * @param {!number} c Change in numeric value over the course of the entire tween. For example, if the start is 5 and the end is 100, the change would be 95.
		 * @param {string=} sfx Suffix (if any)
		 * @param {boolean=} r Round (if true).
		 * @param {boolean=} pad If true, this extra value should be separated by the previous one by a space. If there is no previous extra and pad is true, it will automatically drop the space.
		 * @return {CSSPropTween} returns itself so that multiple methods can be chained together.
		 */
		p.appendXtra = function(pfx, s, c, sfx, r, pad) {
			var pt = this,
				l = pt.l;
			pt["xs" + l] += (pad && (l || pt["xs" + l])) ? " " + pfx : pfx || "";
			if (!c) if (l !== 0 && !pt.plugin) { //typically we'll combine non-changing values right into the xs to optimize performance, but we don't combine them when there's a plugin that will be tweening the values because it may depend on the values being split apart, like for a bezier, if a value doesn't change between the first and second iteration but then it does on the 3rd, we'll run into trouble because there's no xn slot for that value!
				pt["xs" + l] += s + (sfx || "");
				return pt;
			}
			pt.l++;
			pt.type = pt.setRatio ? 2 : 1;
			pt["xs" + pt.l] = sfx || "";
			if (l > 0) {
				pt.data["xn" + l] = s + c;
				pt.rxp["xn" + l] = r; //round extra property (we need to tap into this in the _parseToProxy() method)
				pt["xn" + l] = s;
				if (!pt.plugin) {
					pt.xfirst = new CSSPropTween(pt, "xn" + l, s, c, pt.xfirst || pt, 0, pt.n, r, pt.pr);
					pt.xfirst.xs0 = 0; //just to ensure that the property stays numeric which helps modern browsers speed up processing. Remember, in the setRatio() method, we do pt.t[pt.p] = val + pt.xs0 so if pt.xs0 is "" (the default), it'll cast the end value as a string. When a property is a number sometimes and a string sometimes, it prevents the compiler from locking in the data type, slowing things down slightly.
				}
				return pt;
			}
			pt.data = {s:s + c};
			pt.rxp = {};
			pt.s = s;
			pt.c = c;
			pt.r = r;
			return pt;
		};

		/**
		 * @constructor A SpecialProp is basically a css property that needs to be treated in a non-standard way, like if it may contain a complex value like boxShadow:"5px 10px 15px rgb(255, 102, 51)" or if it is associated with another plugin like ThrowPropsPlugin or BezierPlugin. Every SpecialProp is associated with a particular property name like "boxShadow" or "throwProps" or "bezier" and it will intercept those values in the vars object that's passed to the CSSPlugin and handle them accordingly.
		 * @param {!string} p Property name (like "boxShadow" or "throwProps")
		 * @param {Object=} options An object containing any of the following configuration options:
		 *                      - defaultValue: the default value
		 *                      - parser: A function that should be called when the associated property name is found in the vars. This function should return a CSSPropTween instance and it should ensure that it is properly inserted into the linked list. It will receive 4 paramters: 1) The target, 2) The value defined in the vars, 3) The CSSPlugin instance (whose _firstPT should be used for the linked list), and 4) A computed style object if one was calculated (this is a speed optimization that allows retrieval of starting values quicker)
		 *                      - formatter: a function that formats any value received for this special property (for example, boxShadow could take "5px 5px red" and format it to "5px 5px 0px 0px red" so that both the beginning and ending values have a common order and quantity of values.)
		 *                      - prefix: if true, we'll determine whether or not this property requires a vendor prefix (like Webkit or Moz or ms or O)
		 *                      - color: set this to true if the value for this SpecialProp may contain color-related values like rgb(), rgba(), etc.
		 *                      - priority: priority in the linked list order. Higher priority SpecialProps will be updated before lower priority ones. The default priority is 0.
		 *                      - multi: if true, the formatter should accommodate a comma-delimited list of values, like boxShadow could have multiple boxShadows listed out.
		 *                      - collapsible: if true, the formatter should treat the value like it's a top/right/bottom/left value that could be collapsed, like "5px" would apply to all, "5px, 10px" would use 5px for top/bottom and 10px for right/left, etc.
		 *                      - keyword: a special keyword that can [optionally] be found inside the value (like "inset" for boxShadow). This allows us to validate beginning/ending values to make sure they match (if the keyword is found in one, it'll be added to the other for consistency by default).
		 */
		var SpecialProp = function(p, options) {
				options = options || {};
				this.p = options.prefix ? _checkPropPrefix(p) || p : p;
				_specialProps[p] = _specialProps[this.p] = this;
				this.format = options.formatter || _getFormatter(options.defaultValue, options.color, options.collapsible, options.multi);
				if (options.parser) {
					this.parse = options.parser;
				}
				this.clrs = options.color;
				this.multi = options.multi;
				this.keyword = options.keyword;
				this.dflt = options.defaultValue;
				this.pr = options.priority || 0;
			},

			//shortcut for creating a new SpecialProp that can accept multiple properties as a comma-delimited list (helps minification). dflt can be an array for multiple values (we don't do a comma-delimited list because the default value may contain commas, like rect(0px,0px,0px,0px)). We attach this method to the SpecialProp class/object instead of using a private _createSpecialProp() method so that we can tap into it externally if necessary, like from another plugin.
			_registerComplexSpecialProp = _internals._registerComplexSpecialProp = function(p, options, defaults) {
				if (typeof(options) !== "object") {
					options = {parser:defaults}; //to make backwards compatible with older versions of BezierPlugin and ThrowPropsPlugin
				}
				var a = p.split(","),
					d = options.defaultValue,
					i, temp;
				defaults = defaults || [d];
				for (i = 0; i < a.length; i++) {
					options.prefix = (i === 0 && options.prefix);
					options.defaultValue = defaults[i] || d;
					temp = new SpecialProp(a[i], options);
				}
			},

			//creates a placeholder special prop for a plugin so that the property gets caught the first time a tween of it is attempted, and at that time it makes the plugin register itself, thus taking over for all future tweens of that property. This allows us to not mandate that things load in a particular order and it also allows us to log() an error that informs the user when they attempt to tween an external plugin-related property without loading its .js file.
			_registerPluginProp = _internals._registerPluginProp = function(p) {
				if (!_specialProps[p]) {
					var pluginName = p.charAt(0).toUpperCase() + p.substr(1) + "Plugin";
					_registerComplexSpecialProp(p, {parser:function(t, e, p, cssp, pt, plugin, vars) {
						var pluginClass = _globals.com.greensock.plugins[pluginName];
						if (!pluginClass) {
							_log("Error: " + pluginName + " js file not loaded.");
							return pt;
						}
						pluginClass._cssRegister();
						return _specialProps[p].parse(t, e, p, cssp, pt, plugin, vars);
					}});
				}
			};


		p = SpecialProp.prototype;

		/**
		 * Alias for _parseComplex() that automatically plugs in certain values for this SpecialProp, like its property name, whether or not colors should be sensed, the default value, and priority. It also looks for any keyword that the SpecialProp defines (like "inset" for boxShadow) and ensures that the beginning and ending values have the same number of values for SpecialProps where multi is true (like boxShadow and textShadow can have a comma-delimited list)
		 * @param {!Object} t target element
		 * @param {(string|number|object)} b beginning value
		 * @param {(string|number|object)} e ending (destination) value
		 * @param {CSSPropTween=} pt next CSSPropTween in the linked list
		 * @param {TweenPlugin=} plugin If another plugin will be tweening the complex value, that TweenPlugin instance goes here.
		 * @param {function=} setRatio If a custom setRatio() method should be used to handle this complex value, that goes here.
		 * @return {CSSPropTween=} First CSSPropTween in the linked list
		 */
		p.parseComplex = function(t, b, e, pt, plugin, setRatio) {
			var kwd = this.keyword,
				i, ba, ea, l, bi, ei;
			//if this SpecialProp's value can contain a comma-delimited list of values (like boxShadow or textShadow), we must parse them in a special way, and look for a keyword (like "inset" for boxShadow) and ensure that the beginning and ending BOTH have it if the end defines it as such. We also must ensure that there are an equal number of values specified (we can't tween 1 boxShadow to 3 for example)
			if (this.multi) if (_commasOutsideParenExp.test(e) || _commasOutsideParenExp.test(b)) {
				ba = b.replace(_commasOutsideParenExp, "|").split("|");
				ea = e.replace(_commasOutsideParenExp, "|").split("|");
			} else if (kwd) {
				ba = [b];
				ea = [e];
			}
			if (ea) {
				l = (ea.length > ba.length) ? ea.length : ba.length;
				for (i = 0; i < l; i++) {
					b = ba[i] = ba[i] || this.dflt;
					e = ea[i] = ea[i] || this.dflt;
					if (kwd) {
						bi = b.indexOf(kwd);
						ei = e.indexOf(kwd);
						if (bi !== ei) {
							if (ei === -1) { //if the keyword isn't in the end value, remove it from the beginning one.
								ba[i] = ba[i].split(kwd).join("");
							} else if (bi === -1) { //if the keyword isn't in the beginning, add it.
								ba[i] += " " + kwd;
							}
						}
					}
				}
				b = ba.join(", ");
				e = ea.join(", ");
			}
			return _parseComplex(t, this.p, b, e, this.clrs, this.dflt, pt, this.pr, plugin, setRatio);
		};

		/**
		 * Accepts a target and end value and spits back a CSSPropTween that has been inserted into the CSSPlugin's linked list and conforms with all the conventions we use internally, like type:-1, 0, 1, or 2, setting up any extra property tweens, priority, etc. For example, if we have a boxShadow SpecialProp and call:
		 * this._firstPT = sp.parse(element, "5px 10px 20px rgb(2550,102,51)", "boxShadow", this);
		 * It should figure out the starting value of the element's boxShadow, compare it to the provided end value and create all the necessary CSSPropTweens of the appropriate types to tween the boxShadow. The CSSPropTween that gets spit back should already be inserted into the linked list (the 4th parameter is the current head, so prepend to that).
		 * @param {!Object} t Target object whose property is being tweened
		 * @param {Object} e End value as provided in the vars object (typically a string, but not always - like a throwProps would be an object).
		 * @param {!string} p Property name
		 * @param {!CSSPlugin} cssp The CSSPlugin instance that should be associated with this tween.
		 * @param {?CSSPropTween} pt The CSSPropTween that is the current head of the linked list (we'll prepend to it)
		 * @param {TweenPlugin=} plugin If a plugin will be used to tween the parsed value, this is the plugin instance.
		 * @param {Object=} vars Original vars object that contains the data for parsing.
		 * @return {CSSPropTween} The first CSSPropTween in the linked list which includes the new one(s) added by the parse() call.
		 */
		p.parse = function(t, e, p, cssp, pt, plugin, vars) {
			return this.parseComplex(t.style, this.format(_getStyle(t, this.p, _cs, false, this.dflt)), this.format(e), pt, plugin);
		};

		/**
		 * Registers a special property that should be intercepted from any "css" objects defined in tweens. This allows you to handle them however you want without CSSPlugin doing it for you. The 2nd parameter should be a function that accepts 3 parameters:
		 *  1) Target object whose property should be tweened (typically a DOM element)
		 *  2) The end/destination value (could be a string, number, object, or whatever you want)
		 *  3) The tween instance (you probably don't need to worry about this, but it can be useful for looking up information like the duration)
		 *
		 * Then, your function should return a function which will be called each time the tween gets rendered, passing a numeric "ratio" parameter to your function that indicates the change factor (usually between 0 and 1). For example:
		 *
		 * CSSPlugin.registerSpecialProp("myCustomProp", function(target, value, tween) {
		 *      var start = target.style.width;
		 *      return function(ratio) {
		 *              target.style.width = (start + value * ratio) + "px";
		 *              console.log("set width to " + target.style.width);
		 *          }
		 * }, 0);
		 *
		 * Then, when I do this tween, it will trigger my special property:
		 *
		 * TweenLite.to(element, 1, {css:{myCustomProp:100}});
		 *
		 * In the example, of course, we're just changing the width, but you can do anything you want.
		 *
		 * @param {!string} name Property name (or comma-delimited list of property names) that should be intercepted and handled by your function. For example, if I define "myCustomProp", then it would handle that portion of the following tween: TweenLite.to(element, 1, {css:{myCustomProp:100}})
		 * @param {!function(Object, Object, Object, string):function(number)} onInitTween The function that will be called when a tween of this special property is performed. The function will receive 4 parameters: 1) Target object that should be tweened, 2) Value that was passed to the tween, 3) The tween instance itself (rarely used), and 4) The property name that's being tweened. Your function should return a function that should be called on every update of the tween. That function will receive a single parameter that is a "change factor" value (typically between 0 and 1) indicating the amount of change as a ratio. You can use this to determine how to set the values appropriately in your function.
		 * @param {number=} priority Priority that helps the engine determine the order in which to set the properties (default: 0). Higher priority properties will be updated before lower priority ones.
		 */
		CSSPlugin.registerSpecialProp = function(name, onInitTween, priority) {
			_registerComplexSpecialProp(name, {parser:function(t, e, p, cssp, pt, plugin, vars) {
				var rv = new CSSPropTween(t, p, 0, 0, pt, 2, p, false, priority);
				rv.plugin = plugin;
				rv.setRatio = onInitTween(t, e, cssp._tween, p);
				return rv;
			}, priority:priority});
		};






		//transform-related methods and properties
		CSSPlugin.useSVGTransformAttr = true; //Safari and Firefox both have some rendering bugs when applying CSS transforms to SVG elements, so default to using the "transform" attribute instead (users can override this).
		var _transformProps = ("scaleX,scaleY,scaleZ,x,y,z,skewX,skewY,rotation,rotationX,rotationY,perspective,xPercent,yPercent").split(","),
			_transformProp = _checkPropPrefix("transform"), //the Javascript (camelCase) transform property, like msTransform, WebkitTransform, MozTransform, or OTransform.
			_transformPropCSS = _prefixCSS + "transform",
			_transformOriginProp = _checkPropPrefix("transformOrigin"),
			_supports3D = (_checkPropPrefix("perspective") !== null),
			Transform = _internals.Transform = function() {
				this.perspective = parseFloat(CSSPlugin.defaultTransformPerspective) || 0;
				this.force3D = (CSSPlugin.defaultForce3D === false || !_supports3D) ? false : CSSPlugin.defaultForce3D || "auto";
			},
			_SVGElement = _gsScope.SVGElement,
			_useSVGTransformAttr,
			//Some browsers (like Firefox and IE) don't honor transform-origin properly in SVG elements, so we need to manually adjust the matrix accordingly. We feature detect here rather than always doing the conversion for certain browsers because they may fix the problem at some point in the future.

			_createSVG = function(type, container, attributes) {
				var element = _doc.createElementNS("http://www.w3.org/2000/svg", type),
					reg = /([a-z])([A-Z])/g,
					p;
				for (p in attributes) {
					element.setAttributeNS(null, p.replace(reg, "$1-$2").toLowerCase(), attributes[p]);
				}
				container.appendChild(element);
				return element;
			},
			_docElement = _doc.documentElement || {},
			_forceSVGTransformAttr = (function() {
				//IE and Android stock don't support CSS transforms on SVG elements, so we must write them to the "transform" attribute. We populate this variable in the _parseTransform() method, and only if/when we come across an SVG element
				var force = _ieVers || (/Android/i.test(_agent) && !_gsScope.chrome),
					svg, rect, width;
				if (_doc.createElementNS && !force) { //IE8 and earlier doesn't support SVG anyway
					svg = _createSVG("svg", _docElement);
					rect = _createSVG("rect", svg, {width:100, height:50, x:100});
					width = rect.getBoundingClientRect().width;
					rect.style[_transformOriginProp] = "50% 50%";
					rect.style[_transformProp] = "scaleX(0.5)";
					force = (width === rect.getBoundingClientRect().width && !(_isFirefox && _supports3D)); //note: Firefox fails the test even though it does support CSS transforms in 3D. Since we can't push 3D stuff into the transform attribute, we force Firefox to pass the test here (as long as it does truly support 3D).
					_docElement.removeChild(svg);
				}
				return force;
			})(),
			_parseSVGOrigin = function(e, local, decoratee, absolute, smoothOrigin, skipRecord) {
				var tm = e._gsTransform,
					m = _getMatrix(e, true),
					v, x, y, xOrigin, yOrigin, a, b, c, d, tx, ty, determinant, xOriginOld, yOriginOld;
				if (tm) {
					xOriginOld = tm.xOrigin; //record the original values before we alter them.
					yOriginOld = tm.yOrigin;
				}
				if (!absolute || (v = absolute.split(" ")).length < 2) {
					b = e.getBBox();
					if (b.x === 0 && b.y === 0 && b.width + b.height === 0) { //some browsers (like Firefox) misreport the bounds if the element has zero width and height (it just assumes it's at x:0, y:0), thus we need to manually grab the position in that case.
						b = {x: parseFloat(e.hasAttribute("x") ? e.getAttribute("x") : e.hasAttribute("cx") ? e.getAttribute("cx") : 0) || 0, y: parseFloat(e.hasAttribute("y") ? e.getAttribute("y") : e.hasAttribute("cy") ? e.getAttribute("cy") : 0) || 0, width:0, height:0};
					}
					local = _parsePosition(local).split(" ");
					v = [(local[0].indexOf("%") !== -1 ? parseFloat(local[0]) / 100 * b.width : parseFloat(local[0])) + b.x,
						 (local[1].indexOf("%") !== -1 ? parseFloat(local[1]) / 100 * b.height : parseFloat(local[1])) + b.y];
				}
				decoratee.xOrigin = xOrigin = parseFloat(v[0]);
				decoratee.yOrigin = yOrigin = parseFloat(v[1]);
				if (absolute && m !== _identity2DMatrix) { //if svgOrigin is being set, we must invert the matrix and determine where the absolute point is, factoring in the current transforms. Otherwise, the svgOrigin would be based on the element's non-transformed position on the canvas.
					a = m[0];
					b = m[1];
					c = m[2];
					d = m[3];
					tx = m[4];
					ty = m[5];
					determinant = (a * d - b * c);
					if (determinant) { //if it's zero (like if scaleX and scaleY are zero), skip it to avoid errors with dividing by zero.
						x = xOrigin * (d / determinant) + yOrigin * (-c / determinant) + ((c * ty - d * tx) / determinant);
						y = xOrigin * (-b / determinant) + yOrigin * (a / determinant) - ((a * ty - b * tx) / determinant);
						xOrigin = decoratee.xOrigin = v[0] = x;
						yOrigin = decoratee.yOrigin = v[1] = y;
					}
				}
				if (tm) { //avoid jump when transformOrigin is changed - adjust the x/y values accordingly
					if (skipRecord) {
						decoratee.xOffset = tm.xOffset;
						decoratee.yOffset = tm.yOffset;
						tm = decoratee;
					}
					if (smoothOrigin || (smoothOrigin !== false && CSSPlugin.defaultSmoothOrigin !== false)) {
						x = xOrigin - xOriginOld;
						y = yOrigin - yOriginOld;
						//originally, we simply adjusted the x and y values, but that would cause problems if, for example, you created a rotational tween part-way through an x/y tween. Managing the offset in a separate variable gives us ultimate flexibility.
						//tm.x -= x - (x * m[0] + y * m[2]);
						//tm.y -= y - (x * m[1] + y * m[3]);
						tm.xOffset += (x * m[0] + y * m[2]) - x;
						tm.yOffset += (x * m[1] + y * m[3]) - y;
					} else {
						tm.xOffset = tm.yOffset = 0;
					}
				}
				if (!skipRecord) {
					e.setAttribute("data-svg-origin", v.join(" "));
				}
			},
			_getBBoxHack = function(swapIfPossible) { //works around issues in some browsers (like Firefox) that don't correctly report getBBox() on SVG elements inside a <defs> element and/or <mask>. We try creating an SVG, adding it to the documentElement and toss the element in there so that it's definitely part of the rendering tree, then grab the bbox and if it works, we actually swap out the original getBBox() method for our own that does these extra steps whenever getBBox is needed. This helps ensure that performance is optimal (only do all these extra steps when absolutely necessary...most elements don't need it).
				var svg = _createElement("svg", this.ownerSVGElement.getAttribute("xmlns") || "http://www.w3.org/2000/svg"),
					oldParent = this.parentNode,
					oldSibling = this.nextSibling,
					oldCSS = this.style.cssText,
					bbox;
				_docElement.appendChild(svg);
				svg.appendChild(this);
				this.style.display = "block";
				if (swapIfPossible) {
					try {
						bbox = this.getBBox();
						this._originalGetBBox = this.getBBox;
						this.getBBox = _getBBoxHack;
					} catch (e) { }
				} else if (this._originalGetBBox) {
					bbox = this._originalGetBBox();
				}
				if (oldSibling) {
					oldParent.insertBefore(this, oldSibling);
				} else {
					oldParent.appendChild(this);
				}
				_docElement.removeChild(svg);
				this.style.cssText = oldCSS;
				return bbox;
			},
			_getBBox = function(e) {
				try {
					return e.getBBox(); //Firefox throws errors if you try calling getBBox() on an SVG element that's not rendered (like in a <symbol> or <defs>). https://bugzilla.mozilla.org/show_bug.cgi?id=612118
				} catch (error) {
					return _getBBoxHack.call(e, true);
				}
			},
			_isSVG = function(e) { //reports if the element is an SVG on which getBBox() actually works
				return !!(_SVGElement && e.getCTM && _getBBox(e) && (!e.parentNode || e.ownerSVGElement));
			},
			_identity2DMatrix = [1,0,0,1,0,0],
			_getMatrix = function(e, force2D) {
				var tm = e._gsTransform || new Transform(),
					rnd = 100000,
					style = e.style,
					isDefault, s, m, n, dec, none;
				if (_transformProp) {
					s = _getStyle(e, _transformPropCSS, null, true);
				} else if (e.currentStyle) {
					//for older versions of IE, we need to interpret the filter portion that is in the format: progid:DXImageTransform.Microsoft.Matrix(M11=6.123233995736766e-17, M12=-1, M21=1, M22=6.123233995736766e-17, sizingMethod='auto expand') Notice that we need to swap b and c compared to a normal matrix.
					s = e.currentStyle.filter.match(_ieGetMatrixExp);
					s = (s && s.length === 4) ? [s[0].substr(4), Number(s[2].substr(4)), Number(s[1].substr(4)), s[3].substr(4), (tm.x || 0), (tm.y || 0)].join(",") : "";
				}
				isDefault = (!s || s === "none" || s === "matrix(1, 0, 0, 1, 0, 0)");
				if (isDefault && _transformProp && ((none = (_getComputedStyle(e).display === "none")) || !e.parentNode)) {
					if (none) { //browsers don't report transforms accurately unless the element is in the DOM and has a display value that's not "none".
						n = style.display;
						style.display = "block";
					}
					if (!e.parentNode) {
						dec = 1; //flag
						_docElement.appendChild(e);
					}
					s = _getStyle(e, _transformPropCSS, null, true);
					isDefault = (!s || s === "none" || s === "matrix(1, 0, 0, 1, 0, 0)");
					if (n) {
						style.display = n;
					} else if (none) {
						_removeProp(style, "display");
					}
					if (dec) {
						_docElement.removeChild(e);
					}
				}
				if (tm.svg || (e.getCTM && _isSVG(e))) {
					if (isDefault && (style[_transformProp] + "").indexOf("matrix") !== -1) { //some browsers (like Chrome 40) don't correctly report transforms that are applied inline on an SVG element (they don't get included in the computed style), so we double-check here and accept matrix values
						s = style[_transformProp];
						isDefault = 0;
					}
					m = e.getAttribute("transform");
					if (isDefault && m) {
						if (m.indexOf("matrix") !== -1) { //just in case there's a "transform" value specified as an attribute instead of CSS style. Accept either a matrix() or simple translate() value though.
							s = m;
							isDefault = 0;
						} else if (m.indexOf("translate") !== -1) {
							s = "matrix(1,0,0,1," + m.match(/(?:\-|\b)[\d\-\.e]+\b/gi).join(",") + ")";
							isDefault = 0;
						}
					}
				}
				if (isDefault) {
					return _identity2DMatrix;
				}
				//split the matrix values out into an array (m for matrix)
				m = (s || "").match(_numExp) || [];
				i = m.length;
				while (--i > -1) {
					n = Number(m[i]);
					m[i] = (dec = n - (n |= 0)) ? ((dec * rnd + (dec < 0 ? -0.5 : 0.5)) | 0) / rnd + n : n; //convert strings to Numbers and round to 5 decimal places to avoid issues with tiny numbers. Roughly 20x faster than Number.toFixed(). We also must make sure to round before dividing so that values like 0.9999999999 become 1 to avoid glitches in browser rendering and interpretation of flipped/rotated 3D matrices. And don't just multiply the number by rnd, floor it, and then divide by rnd because the bitwise operations max out at a 32-bit signed integer, thus it could get clipped at a relatively low value (like 22,000.00000 for example).
				}
				return (force2D && m.length > 6) ? [m[0], m[1], m[4], m[5], m[12], m[13]] : m;
			},

			/**
			 * Parses the transform values for an element, returning an object with x, y, z, scaleX, scaleY, scaleZ, rotation, rotationX, rotationY, skewX, and skewY properties. Note: by default (for performance reasons), all skewing is combined into skewX and rotation but skewY still has a place in the transform object so that we can record how much of the skew is attributed to skewX vs skewY. Remember, a skewY of 10 looks the same as a rotation of 10 and skewX of -10.
			 * @param {!Object} t target element
			 * @param {Object=} cs computed style object (optional)
			 * @param {boolean=} rec if true, the transform values will be recorded to the target element's _gsTransform object, like target._gsTransform = {x:0, y:0, z:0, scaleX:1...}
			 * @param {boolean=} parse if true, we'll ignore any _gsTransform values that already exist on the element, and force a reparsing of the css (calculated style)
			 * @return {object} object containing all of the transform properties/values like {x:0, y:0, z:0, scaleX:1...}
			 */
			_getTransform = _internals.getTransform = function(t, cs, rec, parse) {
				if (t._gsTransform && rec && !parse) {
					return t._gsTransform; //if the element already has a _gsTransform, use that. Note: some browsers don't accurately return the calculated style for the transform (particularly for SVG), so it's almost always safest to just use the values we've already applied rather than re-parsing things.
				}
				var tm = rec ? t._gsTransform || new Transform() : new Transform(),
					invX = (tm.scaleX < 0), //in order to interpret things properly, we need to know if the user applied a negative scaleX previously so that we can adjust the rotation and skewX accordingly. Otherwise, if we always interpret a flipped matrix as affecting scaleY and the user only wants to tween the scaleX on multiple sequential tweens, it would keep the negative scaleY without that being the user's intent.
					min = 0.00002,
					rnd = 100000,
					zOrigin = _supports3D ? parseFloat(_getStyle(t, _transformOriginProp, cs, false, "0 0 0").split(" ")[2]) || tm.zOrigin  || 0 : 0,
					defaultTransformPerspective = parseFloat(CSSPlugin.defaultTransformPerspective) || 0,
					m, i, scaleX, scaleY, rotation, skewX;

				tm.svg = !!(t.getCTM && _isSVG(t));
				if (tm.svg) {
					_parseSVGOrigin(t, _getStyle(t, _transformOriginProp, cs, false, "50% 50%") + "", tm, t.getAttribute("data-svg-origin"));
					_useSVGTransformAttr = CSSPlugin.useSVGTransformAttr || _forceSVGTransformAttr;
				}
				m = _getMatrix(t);
				if (m !== _identity2DMatrix) {

					if (m.length === 16) {
						//we'll only look at these position-related 6 variables first because if x/y/z all match, it's relatively safe to assume we don't need to re-parse everything which risks losing important rotational information (like rotationX:180 plus rotationY:180 would look the same as rotation:180 - there's no way to know for sure which direction was taken based solely on the matrix3d() values)
						var a11 = m[0], a21 = m[1], a31 = m[2], a41 = m[3],
							a12 = m[4], a22 = m[5], a32 = m[6], a42 = m[7],
							a13 = m[8], a23 = m[9], a33 = m[10],
							a14 = m[12], a24 = m[13], a34 = m[14],
							a43 = m[11],
							angle = Math.atan2(a32, a33),
							t1, t2, t3, t4, cos, sin;

						//we manually compensate for non-zero z component of transformOrigin to work around bugs in Safari
						if (tm.zOrigin) {
							a34 = -tm.zOrigin;
							a14 = a13*a34-m[12];
							a24 = a23*a34-m[13];
							a34 = a33*a34+tm.zOrigin-m[14];
						}
						tm.rotationX = angle * _RAD2DEG;
						//rotationX
						if (angle) {
							cos = Math.cos(-angle);
							sin = Math.sin(-angle);
							t1 = a12*cos+a13*sin;
							t2 = a22*cos+a23*sin;
							t3 = a32*cos+a33*sin;
							a13 = a12*-sin+a13*cos;
							a23 = a22*-sin+a23*cos;
							a33 = a32*-sin+a33*cos;
							a43 = a42*-sin+a43*cos;
							a12 = t1;
							a22 = t2;
							a32 = t3;
						}
						//rotationY
						angle = Math.atan2(-a31, a33);
						tm.rotationY = angle * _RAD2DEG;
						if (angle) {
							cos = Math.cos(-angle);
							sin = Math.sin(-angle);
							t1 = a11*cos-a13*sin;
							t2 = a21*cos-a23*sin;
							t3 = a31*cos-a33*sin;
							a23 = a21*sin+a23*cos;
							a33 = a31*sin+a33*cos;
							a43 = a41*sin+a43*cos;
							a11 = t1;
							a21 = t2;
							a31 = t3;
						}
						//rotationZ
						angle = Math.atan2(a21, a11);
						tm.rotation = angle * _RAD2DEG;
						if (angle) {
							cos = Math.cos(-angle);
							sin = Math.sin(-angle);
							a11 = a11*cos+a12*sin;
							t2 = a21*cos+a22*sin;
							a22 = a21*-sin+a22*cos;
							a32 = a31*-sin+a32*cos;
							a21 = t2;
						}

						if (tm.rotationX && Math.abs(tm.rotationX) + Math.abs(tm.rotation) > 359.9) { //when rotationY is set, it will often be parsed as 180 degrees different than it should be, and rotationX and rotation both being 180 (it looks the same), so we adjust for that here.
							tm.rotationX = tm.rotation = 0;
							tm.rotationY = 180 - tm.rotationY;
						}

						tm.scaleX = ((Math.sqrt(a11 * a11 + a21 * a21) * rnd + 0.5) | 0) / rnd;
						tm.scaleY = ((Math.sqrt(a22 * a22 + a23 * a23) * rnd + 0.5) | 0) / rnd;
						tm.scaleZ = ((Math.sqrt(a32 * a32 + a33 * a33) * rnd + 0.5) | 0) / rnd;
						if (tm.rotationX || tm.rotationY) {
							tm.skewX = 0;
						} else {
							tm.skewX = (a12 || a22) ? Math.atan2(a12, a22) * _RAD2DEG + tm.rotation : tm.skewX || 0;
							if (Math.abs(tm.skewX) > 90 && Math.abs(tm.skewX) < 270) {
								if (invX) {
									tm.scaleX *= -1;
									tm.skewX += (tm.rotation <= 0) ? 180 : -180;
									tm.rotation += (tm.rotation <= 0) ? 180 : -180;
								} else {
									tm.scaleY *= -1;
									tm.skewX += (tm.skewX <= 0) ? 180 : -180;
								}
							}
						}
						tm.perspective = a43 ? 1 / ((a43 < 0) ? -a43 : a43) : 0;
						tm.x = a14;
						tm.y = a24;
						tm.z = a34;
						if (tm.svg) {
							tm.x -= tm.xOrigin - (tm.xOrigin * a11 - tm.yOrigin * a12);
							tm.y -= tm.yOrigin - (tm.yOrigin * a21 - tm.xOrigin * a22);
						}

					} else if ((!_supports3D || parse || !m.length || tm.x !== m[4] || tm.y !== m[5] || (!tm.rotationX && !tm.rotationY))) { //sometimes a 6-element matrix is returned even when we performed 3D transforms, like if rotationX and rotationY are 180. In cases like this, we still need to honor the 3D transforms. If we just rely on the 2D info, it could affect how the data is interpreted, like scaleY might get set to -1 or rotation could get offset by 180 degrees. For example, do a TweenLite.to(element, 1, {css:{rotationX:180, rotationY:180}}) and then later, TweenLite.to(element, 1, {css:{rotationX:0}}) and without this conditional logic in place, it'd jump to a state of being unrotated when the 2nd tween starts. Then again, we need to honor the fact that the user COULD alter the transforms outside of CSSPlugin, like by manually applying new css, so we try to sense that by looking at x and y because if those changed, we know the changes were made outside CSSPlugin and we force a reinterpretation of the matrix values. Also, in Webkit browsers, if the element's "display" is "none", its calculated style value will always return empty, so if we've already recorded the values in the _gsTransform object, we'll just rely on those.
						var k = (m.length >= 6),
							a = k ? m[0] : 1,
							b = m[1] || 0,
							c = m[2] || 0,
							d = k ? m[3] : 1;
						tm.x = m[4] || 0;
						tm.y = m[5] || 0;
						scaleX = Math.sqrt(a * a + b * b);
						scaleY = Math.sqrt(d * d + c * c);
						rotation = (a || b) ? Math.atan2(b, a) * _RAD2DEG : tm.rotation || 0; //note: if scaleX is 0, we cannot accurately measure rotation. Same for skewX with a scaleY of 0. Therefore, we default to the previously recorded value (or zero if that doesn't exist).
						skewX = (c || d) ? Math.atan2(c, d) * _RAD2DEG + rotation : tm.skewX || 0;
						if (Math.abs(skewX) > 90 && Math.abs(skewX) < 270) {
							if (invX) {
								scaleX *= -1;
								skewX += (rotation <= 0) ? 180 : -180;
								rotation += (rotation <= 0) ? 180 : -180;
							} else {
								scaleY *= -1;
								skewX += (skewX <= 0) ? 180 : -180;
							}
						}
						tm.scaleX = scaleX;
						tm.scaleY = scaleY;
						tm.rotation = rotation;
						tm.skewX = skewX;
						if (_supports3D) {
							tm.rotationX = tm.rotationY = tm.z = 0;
							tm.perspective = defaultTransformPerspective;
							tm.scaleZ = 1;
						}
						if (tm.svg) {
							tm.x -= tm.xOrigin - (tm.xOrigin * a + tm.yOrigin * c);
							tm.y -= tm.yOrigin - (tm.xOrigin * b + tm.yOrigin * d);
						}
					}
					tm.zOrigin = zOrigin;
					//some browsers have a hard time with very small values like 2.4492935982947064e-16 (notice the "e-" towards the end) and would render the object slightly off. So we round to 0 in these cases. The conditional logic here is faster than calling Math.abs(). Also, browsers tend to render a SLIGHTLY rotated object in a fuzzy way, so we need to snap to exactly 0 when appropriate.
					for (i in tm) {
						if (tm[i] < min) if (tm[i] > -min) {
							tm[i] = 0;
						}
					}
				}
				//DEBUG: _log("parsed rotation of " + t.getAttribute("id")+": "+(tm.rotationX)+", "+(tm.rotationY)+", "+(tm.rotation)+", scale: "+tm.scaleX+", "+tm.scaleY+", "+tm.scaleZ+", position: "+tm.x+", "+tm.y+", "+tm.z+", perspective: "+tm.perspective+ ", origin: "+ tm.xOrigin+ ","+ tm.yOrigin);
				if (rec) {
					t._gsTransform = tm; //record to the object's _gsTransform which we use so that tweens can control individual properties independently (we need all the properties to accurately recompose the matrix in the setRatio() method)
					if (tm.svg) { //if we're supposed to apply transforms to the SVG element's "transform" attribute, make sure there aren't any CSS transforms applied or they'll override the attribute ones. Also clear the transform attribute if we're using CSS, just to be clean.
						if (_useSVGTransformAttr && t.style[_transformProp]) {
							TweenLite.delayedCall(0.001, function(){ //if we apply this right away (before anything has rendered), we risk there being no transforms for a brief moment and it also interferes with adjusting the transformOrigin in a tween with immediateRender:true (it'd try reading the matrix and it wouldn't have the appropriate data in place because we just removed it).
								_removeProp(t.style, _transformProp);
							});
						} else if (!_useSVGTransformAttr && t.getAttribute("transform")) {
							TweenLite.delayedCall(0.001, function(){
								t.removeAttribute("transform");
							});
						}
					}
				}
				return tm;
			},

			//for setting 2D transforms in IE6, IE7, and IE8 (must use a "filter" to emulate the behavior of modern day browser transforms)
			_setIETransformRatio = function(v) {
				var t = this.data, //refers to the element's _gsTransform object
					ang = -t.rotation * _DEG2RAD,
					skew = ang + t.skewX * _DEG2RAD,
					rnd = 100000,
					a = ((Math.cos(ang) * t.scaleX * rnd) | 0) / rnd,
					b = ((Math.sin(ang) * t.scaleX * rnd) | 0) / rnd,
					c = ((Math.sin(skew) * -t.scaleY * rnd) | 0) / rnd,
					d = ((Math.cos(skew) * t.scaleY * rnd) | 0) / rnd,
					style = this.t.style,
					cs = this.t.currentStyle,
					filters, val;
				if (!cs) {
					return;
				}
				val = b; //just for swapping the variables an inverting them (reused "val" to avoid creating another variable in memory). IE's filter matrix uses a non-standard matrix configuration (angle goes the opposite way, and b and c are reversed and inverted)
				b = -c;
				c = -val;
				filters = cs.filter;
				style.filter = ""; //remove filters so that we can accurately measure offsetWidth/offsetHeight
				var w = this.t.offsetWidth,
					h = this.t.offsetHeight,
					clip = (cs.position !== "absolute"),
					m = "progid:DXImageTransform.Microsoft.Matrix(M11=" + a + ", M12=" + b + ", M21=" + c + ", M22=" + d,
					ox = t.x + (w * t.xPercent / 100),
					oy = t.y + (h * t.yPercent / 100),
					dx, dy;

				//if transformOrigin is being used, adjust the offset x and y
				if (t.ox != null) {
					dx = ((t.oxp) ? w * t.ox * 0.01 : t.ox) - w / 2;
					dy = ((t.oyp) ? h * t.oy * 0.01 : t.oy) - h / 2;
					ox += dx - (dx * a + dy * b);
					oy += dy - (dx * c + dy * d);
				}

				if (!clip) {
					m += ", sizingMethod='auto expand')";
				} else {
					dx = (w / 2);
					dy = (h / 2);
					//translate to ensure that transformations occur around the correct origin (default is center).
					m += ", Dx=" + (dx - (dx * a + dy * b) + ox) + ", Dy=" + (dy - (dx * c + dy * d) + oy) + ")";
				}
				if (filters.indexOf("DXImageTransform.Microsoft.Matrix(") !== -1) {
					style.filter = filters.replace(_ieSetMatrixExp, m);
				} else {
					style.filter = m + " " + filters; //we must always put the transform/matrix FIRST (before alpha(opacity=xx)) to avoid an IE bug that slices part of the object when rotation is applied with alpha.
				}

				//at the end or beginning of the tween, if the matrix is normal (1, 0, 0, 1) and opacity is 100 (or doesn't exist), remove the filter to improve browser performance.
				if (v === 0 || v === 1) if (a === 1) if (b === 0) if (c === 0) if (d === 1) if (!clip || m.indexOf("Dx=0, Dy=0") !== -1) if (!_opacityExp.test(filters) || parseFloat(RegExp.$1) === 100) if (filters.indexOf("gradient(" && filters.indexOf("Alpha")) === -1) {
					style.removeAttribute("filter");
				}

				//we must set the margins AFTER applying the filter in order to avoid some bugs in IE8 that could (in rare scenarios) cause them to be ignored intermittently (vibration).
				if (!clip) {
					var mult = (_ieVers < 8) ? 1 : -1, //in Internet Explorer 7 and before, the box model is broken, causing the browser to treat the width/height of the actual rotated filtered image as the width/height of the box itself, but Microsoft corrected that in IE8. We must use a negative offset in IE8 on the right/bottom
						marg, prop, dif;
					dx = t.ieOffsetX || 0;
					dy = t.ieOffsetY || 0;
					t.ieOffsetX = Math.round((w - ((a < 0 ? -a : a) * w + (b < 0 ? -b : b) * h)) / 2 + ox);
					t.ieOffsetY = Math.round((h - ((d < 0 ? -d : d) * h + (c < 0 ? -c : c) * w)) / 2 + oy);
					for (i = 0; i < 4; i++) {
						prop = _margins[i];
						marg = cs[prop];
						//we need to get the current margin in case it is being tweened separately (we want to respect that tween's changes)
						val = (marg.indexOf("px") !== -1) ? parseFloat(marg) : _convertToPixels(this.t, prop, parseFloat(marg), marg.replace(_suffixExp, "")) || 0;
						if (val !== t[prop]) {
							dif = (i < 2) ? -t.ieOffsetX : -t.ieOffsetY; //if another tween is controlling a margin, we cannot only apply the difference in the ieOffsets, so we essentially zero-out the dx and dy here in that case. We record the margin(s) later so that we can keep comparing them, making this code very flexible.
						} else {
							dif = (i < 2) ? dx - t.ieOffsetX : dy - t.ieOffsetY;
						}
						style[prop] = (t[prop] = Math.round( val - dif * ((i === 0 || i === 2) ? 1 : mult) )) + "px";
					}
				}
			},

			/* translates a super small decimal to a string WITHOUT scientific notation
			_safeDecimal = function(n) {
				var s = (n < 0 ? -n : n) + "",
					a = s.split("e-");
				return (n < 0 ? "-0." : "0.") + new Array(parseInt(a[1], 10) || 0).join("0") + a[0].split(".").join("");
			},
			*/

			_setTransformRatio = _internals.set3DTransformRatio = _internals.setTransformRatio = function(v) {
				var t = this.data, //refers to the element's _gsTransform object
					style = this.t.style,
					angle = t.rotation,
					rotationX = t.rotationX,
					rotationY = t.rotationY,
					sx = t.scaleX,
					sy = t.scaleY,
					sz = t.scaleZ,
					x = t.x,
					y = t.y,
					z = t.z,
					isSVG = t.svg,
					perspective = t.perspective,
					force3D = t.force3D,
					skewY = t.skewY,
					skewX = t.skewX,
					t1,	a11, a12, a13, a21, a22, a23, a31, a32, a33, a41, a42, a43,
					zOrigin, min, cos, sin, t2, transform, comma, zero, skew, rnd;
				if (skewY) { //for performance reasons, we combine all skewing into the skewX and rotation values. Remember, a skewY of 10 degrees looks the same as a rotation of 10 degrees plus a skewX of 10 degrees.
					skewX += skewY;
					angle += skewY;
				}

				//check to see if we should render as 2D (and SVGs must use 2D when _useSVGTransformAttr is true)
				if (((((v === 1 || v === 0) && force3D === "auto" && (this.tween._totalTime === this.tween._totalDuration || !this.tween._totalTime)) || !force3D) && !z && !perspective && !rotationY && !rotationX && sz === 1) || (_useSVGTransformAttr && isSVG) || !_supports3D) { //on the final render (which could be 0 for a from tween), if there are no 3D aspects, render in 2D to free up memory and improve performance especially on mobile devices. Check the tween's totalTime/totalDuration too in order to make sure it doesn't happen between repeats if it's a repeating tween.

					//2D
					if (angle || skewX || isSVG) {
						angle *= _DEG2RAD;
						skew = skewX * _DEG2RAD;
						rnd = 100000;
						a11 = Math.cos(angle) * sx;
						a21 = Math.sin(angle) * sx;
						a12 = Math.sin(angle - skew) * -sy;
						a22 = Math.cos(angle - skew) * sy;
						if (skew && t.skewType === "simple") { //by default, we compensate skewing on the other axis to make it look more natural, but you can set the skewType to "simple" to use the uncompensated skewing that CSS does
							t1 = Math.tan(skew - skewY * _DEG2RAD);
							t1 = Math.sqrt(1 + t1 * t1);
							a12 *= t1;
							a22 *= t1;
							if (skewY) {
								t1 = Math.tan(skewY * _DEG2RAD);
								t1 = Math.sqrt(1 + t1 * t1);
								a11 *= t1;
								a21 *= t1;
							}
						}
						if (isSVG) {
							x += t.xOrigin - (t.xOrigin * a11 + t.yOrigin * a12) + t.xOffset;
							y += t.yOrigin - (t.xOrigin * a21 + t.yOrigin * a22) + t.yOffset;
							if (_useSVGTransformAttr && (t.xPercent || t.yPercent)) { //The SVG spec doesn't support percentage-based translation in the "transform" attribute, so we merge it into the matrix to simulate it.
								min = this.t.getBBox();
								x += t.xPercent * 0.01 * min.width;
								y += t.yPercent * 0.01 * min.height;
							}
							min = 0.000001;
							if (x < min) if (x > -min) {
								x = 0;
							}
							if (y < min) if (y > -min) {
								y = 0;
							}
						}
						transform = (((a11 * rnd) | 0) / rnd) + "," + (((a21 * rnd) | 0) / rnd) + "," + (((a12 * rnd) | 0) / rnd) + "," + (((a22 * rnd) | 0) / rnd) + "," + x + "," + y + ")";
						if (isSVG && _useSVGTransformAttr) {
							this.t.setAttribute("transform", "matrix(" + transform);
						} else {
							//some browsers have a hard time with very small values like 2.4492935982947064e-16 (notice the "e-" towards the end) and would render the object slightly off. So we round to 5 decimal places.
							style[_transformProp] = ((t.xPercent || t.yPercent) ? "translate(" + t.xPercent + "%," + t.yPercent + "%) matrix(" : "matrix(") + transform;
						}
					} else {
						style[_transformProp] = ((t.xPercent || t.yPercent) ? "translate(" + t.xPercent + "%," + t.yPercent + "%) matrix(" : "matrix(") + sx + ",0,0," + sy + "," + x + "," + y + ")";
					}
					return;

				}
				if (_isFirefox) { //Firefox has a bug (at least in v25) that causes it to render the transparent part of 32-bit PNG images as black when displayed inside an iframe and the 3D scale is very small and doesn't change sufficiently enough between renders (like if you use a Power4.easeInOut to scale from 0 to 1 where the beginning values only change a tiny amount to begin the tween before accelerating). In this case, we force the scale to be 0.00002 instead which is visually the same but works around the Firefox issue.
					min = 0.0001;
					if (sx < min && sx > -min) {
						sx = sz = 0.00002;
					}
					if (sy < min && sy > -min) {
						sy = sz = 0.00002;
					}
					if (perspective && !t.z && !t.rotationX && !t.rotationY) { //Firefox has a bug that causes elements to have an odd super-thin, broken/dotted black border on elements that have a perspective set but aren't utilizing 3D space (no rotationX, rotationY, or z).
						perspective = 0;
					}
				}
				if (angle || skewX) {
					angle *= _DEG2RAD;
					cos = a11 = Math.cos(angle);
					sin = a21 = Math.sin(angle);
					if (skewX) {
						angle -= skewX * _DEG2RAD;
						cos = Math.cos(angle);
						sin = Math.sin(angle);
						if (t.skewType === "simple") { //by default, we compensate skewing on the other axis to make it look more natural, but you can set the skewType to "simple" to use the uncompensated skewing that CSS does
							t1 = Math.tan((skewX - skewY) * _DEG2RAD);
							t1 = Math.sqrt(1 + t1 * t1);
							cos *= t1;
							sin *= t1;
							if (t.skewY) {
								t1 = Math.tan(skewY * _DEG2RAD);
								t1 = Math.sqrt(1 + t1 * t1);
								a11 *= t1;
								a21 *= t1;
							}
						}
					}
					a12 = -sin;
					a22 = cos;

				} else if (!rotationY && !rotationX && sz === 1 && !perspective && !isSVG) { //if we're only translating and/or 2D scaling, this is faster...
					style[_transformProp] = ((t.xPercent || t.yPercent) ? "translate(" + t.xPercent + "%," + t.yPercent + "%) translate3d(" : "translate3d(") + x + "px," + y + "px," + z +"px)" + ((sx !== 1 || sy !== 1) ? " scale(" + sx + "," + sy + ")" : "");
					return;
				} else {
					a11 = a22 = 1;
					a12 = a21 = 0;
				}
				// KEY  INDEX   AFFECTS
				// a11  0       rotation, rotationY, scaleX
				// a21  1       rotation, rotationY, scaleX
				// a31  2       rotationY, scaleX
				// a41  3       rotationY, scaleX
				// a12  4       rotation, skewX, rotationX, scaleY
				// a22  5       rotation, skewX, rotationX, scaleY
				// a32  6       rotationX, scaleY
				// a42  7       rotationX, scaleY
				// a13  8       rotationY, rotationX, scaleZ
				// a23  9       rotationY, rotationX, scaleZ
				// a33  10      rotationY, rotationX, scaleZ
				// a43  11      rotationY, rotationX, perspective, scaleZ
				// a14  12      x, zOrigin, svgOrigin
				// a24  13      y, zOrigin, svgOrigin
				// a34  14      z, zOrigin
				// a44  15
				// rotation: Math.atan2(a21, a11)
				// rotationY: Math.atan2(a13, a33) (or Math.atan2(a13, a11))
				// rotationX: Math.atan2(a32, a33)
				a33 = 1;
				a13 = a23 = a31 = a32 = a41 = a42 = 0;
				a43 = (perspective) ? -1 / perspective : 0;
				zOrigin = t.zOrigin;
				min = 0.000001; //threshold below which browsers use scientific notation which won't work.
				comma = ",";
				zero = "0";
				angle = rotationY * _DEG2RAD;
				if (angle) {
					cos = Math.cos(angle);
					sin = Math.sin(angle);
					a31 = -sin;
					a41 = a43*-sin;
					a13 = a11*sin;
					a23 = a21*sin;
					a33 = cos;
					a43 *= cos;
					a11 *= cos;
					a21 *= cos;
				}
				angle = rotationX * _DEG2RAD;
				if (angle) {
					cos = Math.cos(angle);
					sin = Math.sin(angle);
					t1 = a12*cos+a13*sin;
					t2 = a22*cos+a23*sin;
					a32 = a33*sin;
					a42 = a43*sin;
					a13 = a12*-sin+a13*cos;
					a23 = a22*-sin+a23*cos;
					a33 = a33*cos;
					a43 = a43*cos;
					a12 = t1;
					a22 = t2;
				}
				if (sz !== 1) {
					a13*=sz;
					a23*=sz;
					a33*=sz;
					a43*=sz;
				}
				if (sy !== 1) {
					a12*=sy;
					a22*=sy;
					a32*=sy;
					a42*=sy;
				}
				if (sx !== 1) {
					a11*=sx;
					a21*=sx;
					a31*=sx;
					a41*=sx;
				}

				if (zOrigin || isSVG) {
					if (zOrigin) {
						x += a13*-zOrigin;
						y += a23*-zOrigin;
						z += a33*-zOrigin+zOrigin;
					}
					if (isSVG) { //due to bugs in some browsers, we need to manage the transform-origin of SVG manually
						x += t.xOrigin - (t.xOrigin * a11 + t.yOrigin * a12) + t.xOffset;
						y += t.yOrigin - (t.xOrigin * a21 + t.yOrigin * a22) + t.yOffset;
					}
					if (x < min && x > -min) {
						x = zero;
					}
					if (y < min && y > -min) {
						y = zero;
					}
					if (z < min && z > -min) {
						z = 0; //don't use string because we calculate perspective later and need the number.
					}
				}

				//optimized way of concatenating all the values into a string. If we do it all in one shot, it's slower because of the way browsers have to create temp strings and the way it affects memory. If we do it piece-by-piece with +=, it's a bit slower too. We found that doing it in these sized chunks works best overall:
				transform = ((t.xPercent || t.yPercent) ? "translate(" + t.xPercent + "%," + t.yPercent + "%) matrix3d(" : "matrix3d(");
				transform += ((a11 < min && a11 > -min) ? zero : a11) + comma + ((a21 < min && a21 > -min) ? zero : a21) + comma + ((a31 < min && a31 > -min) ? zero : a31);
				transform += comma + ((a41 < min && a41 > -min) ? zero : a41) + comma + ((a12 < min && a12 > -min) ? zero : a12) + comma + ((a22 < min && a22 > -min) ? zero : a22);
				if (rotationX || rotationY || sz !== 1) { //performance optimization (often there's no rotationX or rotationY, so we can skip these calculations)
					transform += comma + ((a32 < min && a32 > -min) ? zero : a32) + comma + ((a42 < min && a42 > -min) ? zero : a42) + comma + ((a13 < min && a13 > -min) ? zero : a13);
					transform += comma + ((a23 < min && a23 > -min) ? zero : a23) + comma + ((a33 < min && a33 > -min) ? zero : a33) + comma + ((a43 < min && a43 > -min) ? zero : a43) + comma;
				} else {
					transform += ",0,0,0,0,1,0,";
				}
				transform += x + comma + y + comma + z + comma + (perspective ? (1 + (-z / perspective)) : 1) + ")";

				style[_transformProp] = transform;
			};

		p = Transform.prototype;
		p.x = p.y = p.z = p.skewX = p.skewY = p.rotation = p.rotationX = p.rotationY = p.zOrigin = p.xPercent = p.yPercent = p.xOffset = p.yOffset = 0;
		p.scaleX = p.scaleY = p.scaleZ = 1;

		_registerComplexSpecialProp("transform,scale,scaleX,scaleY,scaleZ,x,y,z,rotation,rotationX,rotationY,rotationZ,skewX,skewY,shortRotation,shortRotationX,shortRotationY,shortRotationZ,transformOrigin,svgOrigin,transformPerspective,directionalRotation,parseTransform,force3D,skewType,xPercent,yPercent,smoothOrigin", {parser:function(t, e, parsingProp, cssp, pt, plugin, vars) {
			if (cssp._lastParsedTransform === vars) { return pt; } //only need to parse the transform once, and only if the browser supports it.
			cssp._lastParsedTransform = vars;
			var scaleFunc = (vars.scale && typeof(vars.scale) === "function") ? vars.scale : 0, //if there's a function-based "scale" value, swap in the resulting numeric value temporarily. Otherwise, if it's called for both scaleX and scaleY independently, they may not match (like if the function uses Math.random()).
				swapFunc;
			if (typeof(vars[parsingProp]) === "function") { //whatever property triggers the initial parsing might be a function-based value in which case it already got called in parse(), thus we don't want to call it again in here. The most efficient way to avoid this is to temporarily swap the value directly into the vars object, and then after we do all our parsing in this function, we'll swap it back again.
				swapFunc = vars[parsingProp];
				vars[parsingProp] = e;
			}
			if (scaleFunc) {
				vars.scale = scaleFunc(_index, t);
			}
			var originalGSTransform = t._gsTransform,
				style = t.style,
				min = 0.000001,
				i = _transformProps.length,
				v = vars,
				endRotations = {},
				transformOriginString = "transformOrigin",
				m1 = _getTransform(t, _cs, true, v.parseTransform),
				orig = v.transform && ((typeof(v.transform) === "function") ? v.transform(_index, _target) : v.transform),
				m2, copy, has3D, hasChange, dr, x, y, matrix, p;
			cssp._transform = m1;
			if (orig && typeof(orig) === "string" && _transformProp) { //for values like transform:"rotate(60deg) scale(0.5, 0.8)"
				copy = _tempDiv.style; //don't use the original target because it might be SVG in which case some browsers don't report computed style correctly.
				copy[_transformProp] = orig;
				copy.display = "block"; //if display is "none", the browser often refuses to report the transform properties correctly.
				copy.position = "absolute";
				_doc.body.appendChild(_tempDiv);
				m2 = _getTransform(_tempDiv, null, false);
				if (m1.svg) { //if it's an SVG element, x/y part of the matrix will be affected by whatever we use as the origin and the offsets, so compensate here...
					x = m1.xOrigin;
					y = m1.yOrigin;
					m2.x -= m1.xOffset;
					m2.y -= m1.yOffset;
					if (v.transformOrigin || v.svgOrigin) { //if this tween is altering the origin, we must factor that in here. The actual work of recording the transformOrigin values and setting up the PropTween is done later (still inside this function) so we cannot leave the changes intact here - we only want to update the x/y accordingly.
						orig = {};
						_parseSVGOrigin(t, _parsePosition(v.transformOrigin), orig, v.svgOrigin, v.smoothOrigin, true);
						x = orig.xOrigin;
						y = orig.yOrigin;
						m2.x -= orig.xOffset - m1.xOffset;
						m2.y -= orig.yOffset - m1.yOffset;
					}
					if (x || y) {
						matrix = _getMatrix(_tempDiv, true);
						m2.x -= x - (x * matrix[0] + y * matrix[2]);
						m2.y -= y - (x * matrix[1] + y * matrix[3]);
					}
				}
				_doc.body.removeChild(_tempDiv);
				if (!m2.perspective) {
					m2.perspective = m1.perspective; //tweening to no perspective gives very unintuitive results - just keep the same perspective in that case.
				}
				if (v.xPercent != null) {
					m2.xPercent = _parseVal(v.xPercent, m1.xPercent);
				}
				if (v.yPercent != null) {
					m2.yPercent = _parseVal(v.yPercent, m1.yPercent);
				}
			} else if (typeof(v) === "object") { //for values like scaleX, scaleY, rotation, x, y, skewX, and skewY or transform:{...} (object)
				m2 = {scaleX:_parseVal((v.scaleX != null) ? v.scaleX : v.scale, m1.scaleX),
					scaleY:_parseVal((v.scaleY != null) ? v.scaleY : v.scale, m1.scaleY),
					scaleZ:_parseVal(v.scaleZ, m1.scaleZ),
					x:_parseVal(v.x, m1.x),
					y:_parseVal(v.y, m1.y),
					z:_parseVal(v.z, m1.z),
					xPercent:_parseVal(v.xPercent, m1.xPercent),
					yPercent:_parseVal(v.yPercent, m1.yPercent),
					perspective:_parseVal(v.transformPerspective, m1.perspective)};
				dr = v.directionalRotation;
				if (dr != null) {
					if (typeof(dr) === "object") {
						for (copy in dr) {
							v[copy] = dr[copy];
						}
					} else {
						v.rotation = dr;
					}
				}
				if (typeof(v.x) === "string" && v.x.indexOf("%") !== -1) {
					m2.x = 0;
					m2.xPercent = _parseVal(v.x, m1.xPercent);
				}
				if (typeof(v.y) === "string" && v.y.indexOf("%") !== -1) {
					m2.y = 0;
					m2.yPercent = _parseVal(v.y, m1.yPercent);
				}

				m2.rotation = _parseAngle(("rotation" in v) ? v.rotation : ("shortRotation" in v) ? v.shortRotation + "_short" : ("rotationZ" in v) ? v.rotationZ : m1.rotation, m1.rotation, "rotation", endRotations);
				if (_supports3D) {
					m2.rotationX = _parseAngle(("rotationX" in v) ? v.rotationX : ("shortRotationX" in v) ? v.shortRotationX + "_short" : m1.rotationX || 0, m1.rotationX, "rotationX", endRotations);
					m2.rotationY = _parseAngle(("rotationY" in v) ? v.rotationY : ("shortRotationY" in v) ? v.shortRotationY + "_short" : m1.rotationY || 0, m1.rotationY, "rotationY", endRotations);
				}
				m2.skewX = _parseAngle(v.skewX, m1.skewX);
				m2.skewY = _parseAngle(v.skewY, m1.skewY);
			}
			if (_supports3D && v.force3D != null) {
				m1.force3D = v.force3D;
				hasChange = true;
			}

			m1.skewType = v.skewType || m1.skewType || CSSPlugin.defaultSkewType;

			has3D = (m1.force3D || m1.z || m1.rotationX || m1.rotationY || m2.z || m2.rotationX || m2.rotationY || m2.perspective);
			if (!has3D && v.scale != null) {
				m2.scaleZ = 1; //no need to tween scaleZ.
			}

			while (--i > -1) {
				p = _transformProps[i];
				orig = m2[p] - m1[p];
				if (orig > min || orig < -min || v[p] != null || _forcePT[p] != null) {
					hasChange = true;
					pt = new CSSPropTween(m1, p, m1[p], orig, pt);
					if (p in endRotations) {
						pt.e = endRotations[p]; //directional rotations typically have compensated values during the tween, but we need to make sure they end at exactly what the user requested
					}
					pt.xs0 = 0; //ensures the value stays numeric in setRatio()
					pt.plugin = plugin;
					cssp._overwriteProps.push(pt.n);
				}
			}

			orig = v.transformOrigin;
			if (m1.svg && (orig || v.svgOrigin)) {
				x = m1.xOffset; //when we change the origin, in order to prevent things from jumping we adjust the x/y so we must record those here so that we can create PropTweens for them and flip them at the same time as the origin
				y = m1.yOffset;
				_parseSVGOrigin(t, _parsePosition(orig), m2, v.svgOrigin, v.smoothOrigin);
				pt = _addNonTweeningNumericPT(m1, "xOrigin", (originalGSTransform ? m1 : m2).xOrigin, m2.xOrigin, pt, transformOriginString); //note: if there wasn't a transformOrigin defined yet, just start with the destination one; it's wasteful otherwise, and it causes problems with fromTo() tweens. For example, TweenLite.to("#wheel", 3, {rotation:180, transformOrigin:"50% 50%", delay:1}); TweenLite.fromTo("#wheel", 3, {scale:0.5, transformOrigin:"50% 50%"}, {scale:1, delay:2}); would cause a jump when the from values revert at the beginning of the 2nd tween.
				pt = _addNonTweeningNumericPT(m1, "yOrigin", (originalGSTransform ? m1 : m2).yOrigin, m2.yOrigin, pt, transformOriginString);
				if (x !== m1.xOffset || y !== m1.yOffset) {
					pt = _addNonTweeningNumericPT(m1, "xOffset", (originalGSTransform ? x : m1.xOffset), m1.xOffset, pt, transformOriginString);
					pt = _addNonTweeningNumericPT(m1, "yOffset", (originalGSTransform ? y : m1.yOffset), m1.yOffset, pt, transformOriginString);
				}
				orig = "0px 0px"; //certain browsers (like firefox) completely botch transform-origin, so we must remove it to prevent it from contaminating transforms. We manage it ourselves with xOrigin and yOrigin
			}
			if (orig || (_supports3D && has3D && m1.zOrigin)) { //if anything 3D is happening and there's a transformOrigin with a z component that's non-zero, we must ensure that the transformOrigin's z-component is set to 0 so that we can manually do those calculations to get around Safari bugs. Even if the user didn't specifically define a "transformOrigin" in this particular tween (maybe they did it via css directly).
				if (_transformProp) {
					hasChange = true;
					p = _transformOriginProp;
					orig = (orig || _getStyle(t, p, _cs, false, "50% 50%")) + ""; //cast as string to avoid errors
					pt = new CSSPropTween(style, p, 0, 0, pt, -1, transformOriginString);
					pt.b = style[p];
					pt.plugin = plugin;
					if (_supports3D) {
						copy = m1.zOrigin;
						orig = orig.split(" ");
						m1.zOrigin = ((orig.length > 2 && !(copy !== 0 && orig[2] === "0px")) ? parseFloat(orig[2]) : copy) || 0; //Safari doesn't handle the z part of transformOrigin correctly, so we'll manually handle it in the _set3DTransformRatio() method.
						pt.xs0 = pt.e = orig[0] + " " + (orig[1] || "50%") + " 0px"; //we must define a z value of 0px specifically otherwise iOS 5 Safari will stick with the old one (if one was defined)!
						pt = new CSSPropTween(m1, "zOrigin", 0, 0, pt, -1, pt.n); //we must create a CSSPropTween for the _gsTransform.zOrigin so that it gets reset properly at the beginning if the tween runs backward (as opposed to just setting m1.zOrigin here)
						pt.b = copy;
						pt.xs0 = pt.e = m1.zOrigin;
					} else {
						pt.xs0 = pt.e = orig;
					}

					//for older versions of IE (6-8), we need to manually calculate things inside the setRatio() function. We record origin x and y (ox and oy) and whether or not the values are percentages (oxp and oyp).
				} else {
					_parsePosition(orig + "", m1);
				}
			}
			if (hasChange) {
				cssp._transformType = (!(m1.svg && _useSVGTransformAttr) && (has3D || this._transformType === 3)) ? 3 : 2; //quicker than calling cssp._enableTransforms();
			}
			if (swapFunc) {
				vars[parsingProp] = swapFunc;
			}
			if (scaleFunc) {
				vars.scale = scaleFunc;
			}
			return pt;
		}, prefix:true});

		_registerComplexSpecialProp("boxShadow", {defaultValue:"0px 0px 0px 0px #999", prefix:true, color:true, multi:true, keyword:"inset"});

		_registerComplexSpecialProp("borderRadius", {defaultValue:"0px", parser:function(t, e, p, cssp, pt, plugin) {
			e = this.format(e);
			var props = ["borderTopLeftRadius","borderTopRightRadius","borderBottomRightRadius","borderBottomLeftRadius"],
				style = t.style,
				ea1, i, es2, bs2, bs, es, bn, en, w, h, esfx, bsfx, rel, hn, vn, em;
			w = parseFloat(t.offsetWidth);
			h = parseFloat(t.offsetHeight);
			ea1 = e.split(" ");
			for (i = 0; i < props.length; i++) { //if we're dealing with percentages, we must convert things separately for the horizontal and vertical axis!
				if (this.p.indexOf("border")) { //older browsers used a prefix
					props[i] = _checkPropPrefix(props[i]);
				}
				bs = bs2 = _getStyle(t, props[i], _cs, false, "0px");
				if (bs.indexOf(" ") !== -1) {
					bs2 = bs.split(" ");
					bs = bs2[0];
					bs2 = bs2[1];
				}
				es = es2 = ea1[i];
				bn = parseFloat(bs);
				bsfx = bs.substr((bn + "").length);
				rel = (es.charAt(1) === "=");
				if (rel) {
					en = parseInt(es.charAt(0)+"1", 10);
					es = es.substr(2);
					en *= parseFloat(es);
					esfx = es.substr((en + "").length - (en < 0 ? 1 : 0)) || "";
				} else {
					en = parseFloat(es);
					esfx = es.substr((en + "").length);
				}
				if (esfx === "") {
					esfx = _suffixMap[p] || bsfx;
				}
				if (esfx !== bsfx) {
					hn = _convertToPixels(t, "borderLeft", bn, bsfx); //horizontal number (we use a bogus "borderLeft" property just because the _convertToPixels() method searches for the keywords "Left", "Right", "Top", and "Bottom" to determine of it's a horizontal or vertical property, and we need "border" in the name so that it knows it should measure relative to the element itself, not its parent.
					vn = _convertToPixels(t, "borderTop", bn, bsfx); //vertical number
					if (esfx === "%") {
						bs = (hn / w * 100) + "%";
						bs2 = (vn / h * 100) + "%";
					} else if (esfx === "em") {
						em = _convertToPixels(t, "borderLeft", 1, "em");
						bs = (hn / em) + "em";
						bs2 = (vn / em) + "em";
					} else {
						bs = hn + "px";
						bs2 = vn + "px";
					}
					if (rel) {
						es = (parseFloat(bs) + en) + esfx;
						es2 = (parseFloat(bs2) + en) + esfx;
					}
				}
				pt = _parseComplex(style, props[i], bs + " " + bs2, es + " " + es2, false, "0px", pt);
			}
			return pt;
		}, prefix:true, formatter:_getFormatter("0px 0px 0px 0px", false, true)});
		_registerComplexSpecialProp("borderBottomLeftRadius,borderBottomRightRadius,borderTopLeftRadius,borderTopRightRadius", {defaultValue:"0px", parser:function(t, e, p, cssp, pt, plugin) {
			return _parseComplex(t.style, p, this.format(_getStyle(t, p, _cs, false, "0px 0px")), this.format(e), false, "0px", pt);
		}, prefix:true, formatter:_getFormatter("0px 0px", false, true)});
		_registerComplexSpecialProp("backgroundPosition", {defaultValue:"0 0", parser:function(t, e, p, cssp, pt, plugin) {
			var bp = "background-position",
				cs = (_cs || _getComputedStyle(t, null)),
				bs = this.format( ((cs) ? _ieVers ? cs.getPropertyValue(bp + "-x") + " " + cs.getPropertyValue(bp + "-y") : cs.getPropertyValue(bp) : t.currentStyle.backgroundPositionX + " " + t.currentStyle.backgroundPositionY) || "0 0"), //Internet Explorer doesn't report background-position correctly - we must query background-position-x and background-position-y and combine them (even in IE10). Before IE9, we must do the same with the currentStyle object and use camelCase
				es = this.format(e),
				ba, ea, i, pct, overlap, src;
			if ((bs.indexOf("%") !== -1) !== (es.indexOf("%") !== -1) && es.split(",").length < 2) {
				src = _getStyle(t, "backgroundImage").replace(_urlExp, "");
				if (src && src !== "none") {
					ba = bs.split(" ");
					ea = es.split(" ");
					_tempImg.setAttribute("src", src); //set the temp IMG's src to the background-image so that we can measure its width/height
					i = 2;
					while (--i > -1) {
						bs = ba[i];
						pct = (bs.indexOf("%") !== -1);
						if (pct !== (ea[i].indexOf("%") !== -1)) {
							overlap = (i === 0) ? t.offsetWidth - _tempImg.width : t.offsetHeight - _tempImg.height;
							ba[i] = pct ? (parseFloat(bs) / 100 * overlap) + "px" : (parseFloat(bs) / overlap * 100) + "%";
						}
					}
					bs = ba.join(" ");
				}
			}
			return this.parseComplex(t.style, bs, es, pt, plugin);
		}, formatter:_parsePosition});
		_registerComplexSpecialProp("backgroundSize", {defaultValue:"0 0", formatter:function(v) {
			v += ""; //ensure it's a string
			return _parsePosition(v.indexOf(" ") === -1 ? v + " " + v : v); //if set to something like "100% 100%", Safari typically reports the computed style as just "100%" (no 2nd value), but we should ensure that there are two values, so copy the first one. Otherwise, it'd be interpreted as "100% 0" (wrong).
		}});
		_registerComplexSpecialProp("perspective", {defaultValue:"0px", prefix:true});
		_registerComplexSpecialProp("perspectiveOrigin", {defaultValue:"50% 50%", prefix:true});
		_registerComplexSpecialProp("transformStyle", {prefix:true});
		_registerComplexSpecialProp("backfaceVisibility", {prefix:true});
		_registerComplexSpecialProp("userSelect", {prefix:true});
		_registerComplexSpecialProp("margin", {parser:_getEdgeParser("marginTop,marginRight,marginBottom,marginLeft")});
		_registerComplexSpecialProp("padding", {parser:_getEdgeParser("paddingTop,paddingRight,paddingBottom,paddingLeft")});
		_registerComplexSpecialProp("clip", {defaultValue:"rect(0px,0px,0px,0px)", parser:function(t, e, p, cssp, pt, plugin){
			var b, cs, delim;
			if (_ieVers < 9) { //IE8 and earlier don't report a "clip" value in the currentStyle - instead, the values are split apart into clipTop, clipRight, clipBottom, and clipLeft. Also, in IE7 and earlier, the values inside rect() are space-delimited, not comma-delimited.
				cs = t.currentStyle;
				delim = _ieVers < 8 ? " " : ",";
				b = "rect(" + cs.clipTop + delim + cs.clipRight + delim + cs.clipBottom + delim + cs.clipLeft + ")";
				e = this.format(e).split(",").join(delim);
			} else {
				b = this.format(_getStyle(t, this.p, _cs, false, this.dflt));
				e = this.format(e);
			}
			return this.parseComplex(t.style, b, e, pt, plugin);
		}});
		_registerComplexSpecialProp("textShadow", {defaultValue:"0px 0px 0px #999", color:true, multi:true});
		_registerComplexSpecialProp("autoRound,strictUnits", {parser:function(t, e, p, cssp, pt) {return pt;}}); //just so that we can ignore these properties (not tween them)
		_registerComplexSpecialProp("border", {defaultValue:"0px solid #000", parser:function(t, e, p, cssp, pt, plugin) {
			var bw = _getStyle(t, "borderTopWidth", _cs, false, "0px"),
				end = this.format(e).split(" "),
				esfx = end[0].replace(_suffixExp, "");
			if (esfx !== "px") { //if we're animating to a non-px value, we need to convert the beginning width to that unit.
				bw = (parseFloat(bw) / _convertToPixels(t, "borderTopWidth", 1, esfx)) + esfx;
			}
			return this.parseComplex(t.style, this.format(bw + " " + _getStyle(t, "borderTopStyle", _cs, false, "solid") + " " + _getStyle(t, "borderTopColor", _cs, false, "#000")), end.join(" "), pt, plugin);
			}, color:true, formatter:function(v) {
				var a = v.split(" ");
				return a[0] + " " + (a[1] || "solid") + " " + (v.match(_colorExp) || ["#000"])[0];
			}});
		_registerComplexSpecialProp("borderWidth", {parser:_getEdgeParser("borderTopWidth,borderRightWidth,borderBottomWidth,borderLeftWidth")}); //Firefox doesn't pick up on borderWidth set in style sheets (only inline).
		_registerComplexSpecialProp("float,cssFloat,styleFloat", {parser:function(t, e, p, cssp, pt, plugin) {
			var s = t.style,
				prop = ("cssFloat" in s) ? "cssFloat" : "styleFloat";
			return new CSSPropTween(s, prop, 0, 0, pt, -1, p, false, 0, s[prop], e);
		}});

		//opacity-related
		var _setIEOpacityRatio = function(v) {
				var t = this.t, //refers to the element's style property
					filters = t.filter || _getStyle(this.data, "filter") || "",
					val = (this.s + this.c * v) | 0,
					skip;
				if (val === 100) { //for older versions of IE that need to use a filter to apply opacity, we should remove the filter if opacity hits 1 in order to improve performance, but make sure there isn't a transform (matrix) or gradient in the filters.
					if (filters.indexOf("atrix(") === -1 && filters.indexOf("radient(") === -1 && filters.indexOf("oader(") === -1) {
						t.removeAttribute("filter");
						skip = (!_getStyle(this.data, "filter")); //if a class is applied that has an alpha filter, it will take effect (we don't want that), so re-apply our alpha filter in that case. We must first remove it and then check.
					} else {
						t.filter = filters.replace(_alphaFilterExp, "");
						skip = true;
					}
				}
				if (!skip) {
					if (this.xn1) {
						t.filter = filters = filters || ("alpha(opacity=" + val + ")"); //works around bug in IE7/8 that prevents changes to "visibility" from being applied properly if the filter is changed to a different alpha on the same frame.
					}
					if (filters.indexOf("pacity") === -1) { //only used if browser doesn't support the standard opacity style property (IE 7 and 8). We omit the "O" to avoid case-sensitivity issues
						if (val !== 0 || !this.xn1) { //bugs in IE7/8 won't render the filter properly if opacity is ADDED on the same frame/render as "visibility" changes (this.xn1 is 1 if this tween is an "autoAlpha" tween)
							t.filter = filters + " alpha(opacity=" + val + ")"; //we round the value because otherwise, bugs in IE7/8 can prevent "visibility" changes from being applied properly.
						}
					} else {
						t.filter = filters.replace(_opacityExp, "opacity=" + val);
					}
				}
			};
		_registerComplexSpecialProp("opacity,alpha,autoAlpha", {defaultValue:"1", parser:function(t, e, p, cssp, pt, plugin) {
			var b = parseFloat(_getStyle(t, "opacity", _cs, false, "1")),
				style = t.style,
				isAutoAlpha = (p === "autoAlpha");
			if (typeof(e) === "string" && e.charAt(1) === "=") {
				e = ((e.charAt(0) === "-") ? -1 : 1) * parseFloat(e.substr(2)) + b;
			}
			if (isAutoAlpha && b === 1 && _getStyle(t, "visibility", _cs) === "hidden" && e !== 0) { //if visibility is initially set to "hidden", we should interpret that as intent to make opacity 0 (a convenience)
				b = 0;
			}
			if (_supportsOpacity) {
				pt = new CSSPropTween(style, "opacity", b, e - b, pt);
			} else {
				pt = new CSSPropTween(style, "opacity", b * 100, (e - b) * 100, pt);
				pt.xn1 = isAutoAlpha ? 1 : 0; //we need to record whether or not this is an autoAlpha so that in the setRatio(), we know to duplicate the setting of the alpha in order to work around a bug in IE7 and IE8 that prevents changes to "visibility" from taking effect if the filter is changed to a different alpha(opacity) at the same time. Setting it to the SAME value first, then the new value works around the IE7/8 bug.
				style.zoom = 1; //helps correct an IE issue.
				pt.type = 2;
				pt.b = "alpha(opacity=" + pt.s + ")";
				pt.e = "alpha(opacity=" + (pt.s + pt.c) + ")";
				pt.data = t;
				pt.plugin = plugin;
				pt.setRatio = _setIEOpacityRatio;
			}
			if (isAutoAlpha) { //we have to create the "visibility" PropTween after the opacity one in the linked list so that they run in the order that works properly in IE8 and earlier
				pt = new CSSPropTween(style, "visibility", 0, 0, pt, -1, null, false, 0, ((b !== 0) ? "inherit" : "hidden"), ((e === 0) ? "hidden" : "inherit"));
				pt.xs0 = "inherit";
				cssp._overwriteProps.push(pt.n);
				cssp._overwriteProps.push(p);
			}
			return pt;
		}});


		var _removeProp = function(s, p) {
				if (p) {
					if (s.removeProperty) {
						if (p.substr(0,2) === "ms" || p.substr(0,6) === "webkit") { //Microsoft and some Webkit browsers don't conform to the standard of capitalizing the first prefix character, so we adjust so that when we prefix the caps with a dash, it's correct (otherwise it'd be "ms-transform" instead of "-ms-transform" for IE9, for example)
							p = "-" + p;
						}
						s.removeProperty(p.replace(_capsExp, "-$1").toLowerCase());
					} else { //note: old versions of IE use "removeAttribute()" instead of "removeProperty()"
						s.removeAttribute(p);
					}
				}
			},
			_setClassNameRatio = function(v) {
				this.t._gsClassPT = this;
				if (v === 1 || v === 0) {
					this.t.setAttribute("class", (v === 0) ? this.b : this.e);
					var mpt = this.data, //first MiniPropTween
						s = this.t.style;
					while (mpt) {
						if (!mpt.v) {
							_removeProp(s, mpt.p);
						} else {
							s[mpt.p] = mpt.v;
						}
						mpt = mpt._next;
					}
					if (v === 1 && this.t._gsClassPT === this) {
						this.t._gsClassPT = null;
					}
				} else if (this.t.getAttribute("class") !== this.e) {
					this.t.setAttribute("class", this.e);
				}
			};
		_registerComplexSpecialProp("className", {parser:function(t, e, p, cssp, pt, plugin, vars) {
			var b = t.getAttribute("class") || "", //don't use t.className because it doesn't work consistently on SVG elements; getAttribute("class") and setAttribute("class", value") is more reliable.
				cssText = t.style.cssText,
				difData, bs, cnpt, cnptLookup, mpt;
			pt = cssp._classNamePT = new CSSPropTween(t, p, 0, 0, pt, 2);
			pt.setRatio = _setClassNameRatio;
			pt.pr = -11;
			_hasPriority = true;
			pt.b = b;
			bs = _getAllStyles(t, _cs);
			//if there's a className tween already operating on the target, force it to its end so that the necessary inline styles are removed and the class name is applied before we determine the end state (we don't want inline styles interfering that were there just for class-specific values)
			cnpt = t._gsClassPT;
			if (cnpt) {
				cnptLookup = {};
				mpt = cnpt.data; //first MiniPropTween which stores the inline styles - we need to force these so that the inline styles don't contaminate things. Otherwise, there's a small chance that a tween could start and the inline values match the destination values and they never get cleaned.
				while (mpt) {
					cnptLookup[mpt.p] = 1;
					mpt = mpt._next;
				}
				cnpt.setRatio(1);
			}
			t._gsClassPT = pt;
			pt.e = (e.charAt(1) !== "=") ? e : b.replace(new RegExp("(?:\\s|^)" + e.substr(2) + "(?![\\w-])"), "") + ((e.charAt(0) === "+") ? " " + e.substr(2) : "");
			t.setAttribute("class", pt.e);
			difData = _cssDif(t, bs, _getAllStyles(t), vars, cnptLookup);
			t.setAttribute("class", b);
			pt.data = difData.firstMPT;
			t.style.cssText = cssText; //we recorded cssText before we swapped classes and ran _getAllStyles() because in cases when a className tween is overwritten, we remove all the related tweening properties from that class change (otherwise class-specific stuff can't override properties we've directly set on the target's style object due to specificity).
			pt = pt.xfirst = cssp.parse(t, difData.difs, pt, plugin); //we record the CSSPropTween as the xfirst so that we can handle overwriting propertly (if "className" gets overwritten, we must kill all the properties associated with the className part of the tween, so we can loop through from xfirst to the pt itself)
			return pt;
		}});


		var _setClearPropsRatio = function(v) {
			if (v === 1 || v === 0) if (this.data._totalTime === this.data._totalDuration && this.data.data !== "isFromStart") { //this.data refers to the tween. Only clear at the END of the tween (remember, from() tweens make the ratio go from 1 to 0, so we can't just check that and if the tween is the zero-duration one that's created internally to render the starting values in a from() tween, ignore that because otherwise, for example, from(...{height:100, clearProps:"height", delay:1}) would wipe the height at the beginning of the tween and after 1 second, it'd kick back in).
				var s = this.t.style,
					transformParse = _specialProps.transform.parse,
					a, p, i, clearTransform, transform;
				if (this.e === "all") {
					s.cssText = "";
					clearTransform = true;
				} else {
					a = this.e.split(" ").join("").split(",");
					i = a.length;
					while (--i > -1) {
						p = a[i];
						if (_specialProps[p]) {
							if (_specialProps[p].parse === transformParse) {
								clearTransform = true;
							} else {
								p = (p === "transformOrigin") ? _transformOriginProp : _specialProps[p].p; //ensures that special properties use the proper browser-specific property name, like "scaleX" might be "-webkit-transform" or "boxShadow" might be "-moz-box-shadow"
							}
						}
						_removeProp(s, p);
					}
				}
				if (clearTransform) {
					_removeProp(s, _transformProp);
					transform = this.t._gsTransform;
					if (transform) {
						if (transform.svg) {
							this.t.removeAttribute("data-svg-origin");
							this.t.removeAttribute("transform");
						}
						delete this.t._gsTransform;
					}
				}

			}
		};
		_registerComplexSpecialProp("clearProps", {parser:function(t, e, p, cssp, pt) {
			pt = new CSSPropTween(t, p, 0, 0, pt, 2);
			pt.setRatio = _setClearPropsRatio;
			pt.e = e;
			pt.pr = -10;
			pt.data = cssp._tween;
			_hasPriority = true;
			return pt;
		}});

		p = "bezier,throwProps,physicsProps,physics2D".split(",");
		i = p.length;
		while (i--) {
			_registerPluginProp(p[i]);
		}








		p = CSSPlugin.prototype;
		p._firstPT = p._lastParsedTransform = p._transform = null;

		//gets called when the tween renders for the first time. This kicks everything off, recording start/end values, etc.
		p._onInitTween = function(target, vars, tween, index) {
			if (!target.nodeType) { //css is only for dom elements
				return false;
			}
			this._target = _target = target;
			this._tween = tween;
			this._vars = vars;
			_index = index;
			_autoRound = vars.autoRound;
			_hasPriority = false;
			_suffixMap = vars.suffixMap || CSSPlugin.suffixMap;
			_cs = _getComputedStyle(target, "");
			_overwriteProps = this._overwriteProps;
			var style = target.style,
				v, pt, pt2, first, last, next, zIndex, tpt, threeD;
			if (_reqSafariFix) if (style.zIndex === "") {
				v = _getStyle(target, "zIndex", _cs);
				if (v === "auto" || v === "") {
					//corrects a bug in [non-Android] Safari that prevents it from repainting elements in their new positions if they don't have a zIndex set. We also can't just apply this inside _parseTransform() because anything that's moved in any way (like using "left" or "top" instead of transforms like "x" and "y") can be affected, so it is best to ensure that anything that's tweening has a z-index. Setting "WebkitPerspective" to a non-zero value worked too except that on iOS Safari things would flicker randomly. Plus zIndex is less memory-intensive.
					this._addLazySet(style, "zIndex", 0);
				}
			}

			if (typeof(vars) === "string") {
				first = style.cssText;
				v = _getAllStyles(target, _cs);
				style.cssText = first + ";" + vars;
				v = _cssDif(target, v, _getAllStyles(target)).difs;
				if (!_supportsOpacity && _opacityValExp.test(vars)) {
					v.opacity = parseFloat( RegExp.$1 );
				}
				vars = v;
				style.cssText = first;
			}

			if (vars.className) { //className tweens will combine any differences they find in the css with the vars that are passed in, so {className:"myClass", scale:0.5, left:20} would work.
				this._firstPT = pt = _specialProps.className.parse(target, vars.className, "className", this, null, null, vars);
			} else {
				this._firstPT = pt = this.parse(target, vars, null);
			}

			if (this._transformType) {
				threeD = (this._transformType === 3);
				if (!_transformProp) {
					style.zoom = 1; //helps correct an IE issue.
				} else if (_isSafari) {
					_reqSafariFix = true;
					//if zIndex isn't set, iOS Safari doesn't repaint things correctly sometimes (seemingly at random).
					if (style.zIndex === "") {
						zIndex = _getStyle(target, "zIndex", _cs);
						if (zIndex === "auto" || zIndex === "") {
							this._addLazySet(style, "zIndex", 0);
						}
					}
					//Setting WebkitBackfaceVisibility corrects 3 bugs:
					// 1) [non-Android] Safari skips rendering changes to "top" and "left" that are made on the same frame/render as a transform update.
					// 2) iOS Safari sometimes neglects to repaint elements in their new positions. Setting "WebkitPerspective" to a non-zero value worked too except that on iOS Safari things would flicker randomly.
					// 3) Safari sometimes displayed odd artifacts when tweening the transform (or WebkitTransform) property, like ghosts of the edges of the element remained. Definitely a browser bug.
					//Note: we allow the user to override the auto-setting by defining WebkitBackfaceVisibility in the vars of the tween.
					if (_isSafariLT6) {
						this._addLazySet(style, "WebkitBackfaceVisibility", this._vars.WebkitBackfaceVisibility || (threeD ? "visible" : "hidden"));
					}
				}
				pt2 = pt;
				while (pt2 && pt2._next) {
					pt2 = pt2._next;
				}
				tpt = new CSSPropTween(target, "transform", 0, 0, null, 2);
				this._linkCSSP(tpt, null, pt2);
				tpt.setRatio = _transformProp ? _setTransformRatio : _setIETransformRatio;
				tpt.data = this._transform || _getTransform(target, _cs, true);
				tpt.tween = tween;
				tpt.pr = -1; //ensures that the transforms get applied after the components are updated.
				_overwriteProps.pop(); //we don't want to force the overwrite of all "transform" tweens of the target - we only care about individual transform properties like scaleX, rotation, etc. The CSSPropTween constructor automatically adds the property to _overwriteProps which is why we need to pop() here.
			}

			if (_hasPriority) {
				//reorders the linked list in order of pr (priority)
				while (pt) {
					next = pt._next;
					pt2 = first;
					while (pt2 && pt2.pr > pt.pr) {
						pt2 = pt2._next;
					}
					if ((pt._prev = pt2 ? pt2._prev : last)) {
						pt._prev._next = pt;
					} else {
						first = pt;
					}
					if ((pt._next = pt2)) {
						pt2._prev = pt;
					} else {
						last = pt;
					}
					pt = next;
				}
				this._firstPT = first;
			}
			return true;
		};


		p.parse = function(target, vars, pt, plugin) {
			var style = target.style,
				p, sp, bn, en, bs, es, bsfx, esfx, isStr, rel;
			for (p in vars) {
				es = vars[p]; //ending value string
				if (typeof(es) === "function") {
					es = es(_index, _target);
				}
				sp = _specialProps[p]; //SpecialProp lookup.
				if (sp) {
					pt = sp.parse(target, es, p, this, pt, plugin, vars);

				} else {
					bs = _getStyle(target, p, _cs) + "";
					isStr = (typeof(es) === "string");
					if (p === "color" || p === "fill" || p === "stroke" || p.indexOf("Color") !== -1 || (isStr && _rgbhslExp.test(es))) { //Opera uses background: to define color sometimes in addition to backgroundColor:
						if (!isStr) {
							es = _parseColor(es);
							es = ((es.length > 3) ? "rgba(" : "rgb(") + es.join(",") + ")";
						}
						pt = _parseComplex(style, p, bs, es, true, "transparent", pt, 0, plugin);

					} else if (isStr && _complexExp.test(es)) {
						pt = _parseComplex(style, p, bs, es, true, null, pt, 0, plugin);

					} else {
						bn = parseFloat(bs);
						bsfx = (bn || bn === 0) ? bs.substr((bn + "").length) : ""; //remember, bs could be non-numeric like "normal" for fontWeight, so we should default to a blank suffix in that case.

						if (bs === "" || bs === "auto") {
							if (p === "width" || p === "height") {
								bn = _getDimension(target, p, _cs);
								bsfx = "px";
							} else if (p === "left" || p === "top") {
								bn = _calculateOffset(target, p, _cs);
								bsfx = "px";
							} else {
								bn = (p !== "opacity") ? 0 : 1;
								bsfx = "";
							}
						}

						rel = (isStr && es.charAt(1) === "=");
						if (rel) {
							en = parseInt(es.charAt(0) + "1", 10);
							es = es.substr(2);
							en *= parseFloat(es);
							esfx = es.replace(_suffixExp, "");
						} else {
							en = parseFloat(es);
							esfx = isStr ? es.replace(_suffixExp, "") : "";
						}

						if (esfx === "") {
							esfx = (p in _suffixMap) ? _suffixMap[p] : bsfx; //populate the end suffix, prioritizing the map, then if none is found, use the beginning suffix.
						}

						es = (en || en === 0) ? (rel ? en + bn : en) + esfx : vars[p]; //ensures that any += or -= prefixes are taken care of. Record the end value before normalizing the suffix because we always want to end the tween on exactly what they intended even if it doesn't match the beginning value's suffix.

						//if the beginning/ending suffixes don't match, normalize them...
						if (bsfx !== esfx) if (esfx !== "") if (en || en === 0) if (bn) { //note: if the beginning value (bn) is 0, we don't need to convert units!
							bn = _convertToPixels(target, p, bn, bsfx);
							if (esfx === "%") {
								bn /= _convertToPixels(target, p, 100, "%") / 100;
								if (vars.strictUnits !== true) { //some browsers report only "px" values instead of allowing "%" with getComputedStyle(), so we assume that if we're tweening to a %, we should start there too unless strictUnits:true is defined. This approach is particularly useful for responsive designs that use from() tweens.
									bs = bn + "%";
								}

							} else if (esfx === "em" || esfx === "rem" || esfx === "vw" || esfx === "vh") {
								bn /= _convertToPixels(target, p, 1, esfx);

							//otherwise convert to pixels.
							} else if (esfx !== "px") {
								en = _convertToPixels(target, p, en, esfx);
								esfx = "px"; //we don't use bsfx after this, so we don't need to set it to px too.
							}
							if (rel) if (en || en === 0) {
								es = (en + bn) + esfx; //the changes we made affect relative calculations, so adjust the end value here.
							}
						}

						if (rel) {
							en += bn;
						}

						if ((bn || bn === 0) && (en || en === 0)) { //faster than isNaN(). Also, previously we required en !== bn but that doesn't really gain much performance and it prevents _parseToProxy() from working properly if beginning and ending values match but need to get tweened by an external plugin anyway. For example, a bezier tween where the target starts at left:0 and has these points: [{left:50},{left:0}] wouldn't work properly because when parsing the last point, it'd match the first (current) one and a non-tweening CSSPropTween would be recorded when we actually need a normal tween (type:0) so that things get updated during the tween properly.
							pt = new CSSPropTween(style, p, bn, en - bn, pt, 0, p, (_autoRound !== false && (esfx === "px" || p === "zIndex")), 0, bs, es);
							pt.xs0 = esfx;
							//DEBUG: _log("tween "+p+" from "+pt.b+" ("+bn+esfx+") to "+pt.e+" with suffix: "+pt.xs0);
						} else if (style[p] === undefined || !es && (es + "" === "NaN" || es == null)) {
							_log("invalid " + p + " tween value: " + vars[p]);
						} else {
							pt = new CSSPropTween(style, p, en || bn || 0, 0, pt, -1, p, false, 0, bs, es);
							pt.xs0 = (es === "none" && (p === "display" || p.indexOf("Style") !== -1)) ? bs : es; //intermediate value should typically be set immediately (end value) except for "display" or things like borderTopStyle, borderBottomStyle, etc. which should use the beginning value during the tween.
							//DEBUG: _log("non-tweening value "+p+": "+pt.xs0);
						}
					}
				}
				if (plugin) if (pt && !pt.plugin) {
					pt.plugin = plugin;
				}
			}
			return pt;
		};


		//gets called every time the tween updates, passing the new ratio (typically a value between 0 and 1, but not always (for example, if an Elastic.easeOut is used, the value can jump above 1 mid-tween). It will always start and 0 and end at 1.
		p.setRatio = function(v) {
			var pt = this._firstPT,
				min = 0.000001,
				val, str, i;
			//at the end of the tween, we set the values to exactly what we received in order to make sure non-tweening values (like "position" or "float" or whatever) are set and so that if the beginning/ending suffixes (units) didn't match and we normalized to px, the value that the user passed in is used here. We check to see if the tween is at its beginning in case it's a from() tween in which case the ratio will actually go from 1 to 0 over the course of the tween (backwards).
			if (v === 1 && (this._tween._time === this._tween._duration || this._tween._time === 0)) {
				while (pt) {
					if (pt.type !== 2) {
						if (pt.r && pt.type !== -1) {
							val = Math.round(pt.s + pt.c);
							if (!pt.type) {
								pt.t[pt.p] = val + pt.xs0;
							} else if (pt.type === 1) { //complex value (one that typically has multiple numbers inside a string, like "rect(5px,10px,20px,25px)"
								i = pt.l;
								str = pt.xs0 + val + pt.xs1;
								for (i = 1; i < pt.l; i++) {
									str += pt["xn"+i] + pt["xs"+(i+1)];
								}
								pt.t[pt.p] = str;
							}
						} else {
							pt.t[pt.p] = pt.e;
						}
					} else {
						pt.setRatio(v);
					}
					pt = pt._next;
				}

			} else if (v || !(this._tween._time === this._tween._duration || this._tween._time === 0) || this._tween._rawPrevTime === -0.000001) {
				while (pt) {
					val = pt.c * v + pt.s;
					if (pt.r) {
						val = Math.round(val);
					} else if (val < min) if (val > -min) {
						val = 0;
					}
					if (!pt.type) {
						pt.t[pt.p] = val + pt.xs0;
					} else if (pt.type === 1) { //complex value (one that typically has multiple numbers inside a string, like "rect(5px,10px,20px,25px)"
						i = pt.l;
						if (i === 2) {
							pt.t[pt.p] = pt.xs0 + val + pt.xs1 + pt.xn1 + pt.xs2;
						} else if (i === 3) {
							pt.t[pt.p] = pt.xs0 + val + pt.xs1 + pt.xn1 + pt.xs2 + pt.xn2 + pt.xs3;
						} else if (i === 4) {
							pt.t[pt.p] = pt.xs0 + val + pt.xs1 + pt.xn1 + pt.xs2 + pt.xn2 + pt.xs3 + pt.xn3 + pt.xs4;
						} else if (i === 5) {
							pt.t[pt.p] = pt.xs0 + val + pt.xs1 + pt.xn1 + pt.xs2 + pt.xn2 + pt.xs3 + pt.xn3 + pt.xs4 + pt.xn4 + pt.xs5;
						} else {
							str = pt.xs0 + val + pt.xs1;
							for (i = 1; i < pt.l; i++) {
								str += pt["xn"+i] + pt["xs"+(i+1)];
							}
							pt.t[pt.p] = str;
						}

					} else if (pt.type === -1) { //non-tweening value
						pt.t[pt.p] = pt.xs0;

					} else if (pt.setRatio) { //custom setRatio() for things like SpecialProps, external plugins, etc.
						pt.setRatio(v);
					}
					pt = pt._next;
				}

			//if the tween is reversed all the way back to the beginning, we need to restore the original values which may have different units (like % instead of px or em or whatever).
			} else {
				while (pt) {
					if (pt.type !== 2) {
						pt.t[pt.p] = pt.b;
					} else {
						pt.setRatio(v);
					}
					pt = pt._next;
				}
			}
		};

		/**
		 * @private
		 * Forces rendering of the target's transforms (rotation, scale, etc.) whenever the CSSPlugin's setRatio() is called.
		 * Basically, this tells the CSSPlugin to create a CSSPropTween (type 2) after instantiation that runs last in the linked
		 * list and calls the appropriate (3D or 2D) rendering function. We separate this into its own method so that we can call
		 * it from other plugins like BezierPlugin if, for example, it needs to apply an autoRotation and this CSSPlugin
		 * doesn't have any transform-related properties of its own. You can call this method as many times as you
		 * want and it won't create duplicate CSSPropTweens.
		 *
		 * @param {boolean} threeD if true, it should apply 3D tweens (otherwise, just 2D ones are fine and typically faster)
		 */
		p._enableTransforms = function(threeD) {
			this._transform = this._transform || _getTransform(this._target, _cs, true); //ensures that the element has a _gsTransform property with the appropriate values.
			this._transformType = (!(this._transform.svg && _useSVGTransformAttr) && (threeD || this._transformType === 3)) ? 3 : 2;
		};

		var lazySet = function(v) {
			this.t[this.p] = this.e;
			this.data._linkCSSP(this, this._next, null, true); //we purposefully keep this._next even though it'd make sense to null it, but this is a performance optimization, as this happens during the while (pt) {} loop in setRatio() at the bottom of which it sets pt = pt._next, so if we null it, the linked list will be broken in that loop.
		};
		/** @private Gives us a way to set a value on the first render (and only the first render). **/
		p._addLazySet = function(t, p, v) {
			var pt = this._firstPT = new CSSPropTween(t, p, 0, 0, this._firstPT, 2);
			pt.e = v;
			pt.setRatio = lazySet;
			pt.data = this;
		};

		/** @private **/
		p._linkCSSP = function(pt, next, prev, remove) {
			if (pt) {
				if (next) {
					next._prev = pt;
				}
				if (pt._next) {
					pt._next._prev = pt._prev;
				}
				if (pt._prev) {
					pt._prev._next = pt._next;
				} else if (this._firstPT === pt) {
					this._firstPT = pt._next;
					remove = true; //just to prevent resetting this._firstPT 5 lines down in case pt._next is null. (optimized for speed)
				}
				if (prev) {
					prev._next = pt;
				} else if (!remove && this._firstPT === null) {
					this._firstPT = pt;
				}
				pt._next = next;
				pt._prev = prev;
			}
			return pt;
		};

		p._mod = function(lookup) {
			var pt = this._firstPT;
			while (pt) {
				if (typeof(lookup[pt.p]) === "function" && lookup[pt.p] === Math.round) { //only gets called by RoundPropsPlugin (ModifyPlugin manages all the rendering internally for CSSPlugin properties that need modification). Remember, we handle rounding a bit differently in this plugin for performance reasons, leveraging "r" as an indicator that the value should be rounded internally..
					pt.r = 1;
				}
				pt = pt._next;
			}
		};

		//we need to make sure that if alpha or autoAlpha is killed, opacity is too. And autoAlpha affects the "visibility" property.
		p._kill = function(lookup) {
			var copy = lookup,
				pt, p, xfirst;
			if (lookup.autoAlpha || lookup.alpha) {
				copy = {};
				for (p in lookup) { //copy the lookup so that we're not changing the original which may be passed elsewhere.
					copy[p] = lookup[p];
				}
				copy.opacity = 1;
				if (copy.autoAlpha) {
					copy.visibility = 1;
				}
			}
			if (lookup.className && (pt = this._classNamePT)) { //for className tweens, we need to kill any associated CSSPropTweens too; a linked list starts at the className's "xfirst".
				xfirst = pt.xfirst;
				if (xfirst && xfirst._prev) {
					this._linkCSSP(xfirst._prev, pt._next, xfirst._prev._prev); //break off the prev
				} else if (xfirst === this._firstPT) {
					this._firstPT = pt._next;
				}
				if (pt._next) {
					this._linkCSSP(pt._next, pt._next._next, xfirst._prev);
				}
				this._classNamePT = null;
			}
			pt = this._firstPT;
			while (pt) {
				if (pt.plugin && pt.plugin !== p && pt.plugin._kill) { //for plugins that are registered with CSSPlugin, we should notify them of the kill.
					pt.plugin._kill(lookup);
					p = pt.plugin;
				}
				pt = pt._next;
			}
			return TweenPlugin.prototype._kill.call(this, copy);
		};



		//used by cascadeTo() for gathering all the style properties of each child element into an array for comparison.
		var _getChildStyles = function(e, props, targets) {
				var children, i, child, type;
				if (e.slice) {
					i = e.length;
					while (--i > -1) {
						_getChildStyles(e[i], props, targets);
					}
					return;
				}
				children = e.childNodes;
				i = children.length;
				while (--i > -1) {
					child = children[i];
					type = child.type;
					if (child.style) {
						props.push(_getAllStyles(child));
						if (targets) {
							targets.push(child);
						}
					}
					if ((type === 1 || type === 9 || type === 11) && child.childNodes.length) {
						_getChildStyles(child, props, targets);
					}
				}
			};

		/**
		 * Typically only useful for className tweens that may affect child elements, this method creates a TweenLite
		 * and then compares the style properties of all the target's child elements at the tween's start and end, and
		 * if any are different, it also creates tweens for those and returns an array containing ALL of the resulting
		 * tweens (so that you can easily add() them to a TimelineLite, for example). The reason this functionality is
		 * wrapped into a separate static method of CSSPlugin instead of being integrated into all regular className tweens
		 * is because it creates entirely new tweens that may have completely different targets than the original tween,
		 * so if they were all lumped into the original tween instance, it would be inconsistent with the rest of the API
		 * and it would create other problems. For example:
		 *  - If I create a tween of elementA, that tween instance may suddenly change its target to include 50 other elements (unintuitive if I specifically defined the target I wanted)
		 *  - We can't just create new independent tweens because otherwise, what happens if the original/parent tween is reversed or pause or dropped into a TimelineLite for tight control? You'd expect that tween's behavior to affect all the others.
		 *  - Analyzing every style property of every child before and after the tween is an expensive operation when there are many children, so this behavior shouldn't be imposed on all className tweens by default, especially since it's probably rare that this extra functionality is needed.
		 *
		 * @param {Object} target object to be tweened
		 * @param {number} Duration in seconds (or frames for frames-based tweens)
		 * @param {Object} Object containing the end values, like {className:"newClass", ease:Linear.easeNone}
		 * @return {Array} An array of TweenLite instances
		 */
		CSSPlugin.cascadeTo = function(target, duration, vars) {
			var tween = TweenLite.to(target, duration, vars),
				results = [tween],
				b = [],
				e = [],
				targets = [],
				_reservedProps = TweenLite._internals.reservedProps,
				i, difs, p, from;
			target = tween._targets || tween.target;
			_getChildStyles(target, b, targets);
			tween.render(duration, true, true);
			_getChildStyles(target, e);
			tween.render(0, true, true);
			tween._enabled(true);
			i = targets.length;
			while (--i > -1) {
				difs = _cssDif(targets[i], b[i], e[i]);
				if (difs.firstMPT) {
					difs = difs.difs;
					for (p in vars) {
						if (_reservedProps[p]) {
							difs[p] = vars[p];
						}
					}
					from = {};
					for (p in difs) {
						from[p] = b[i][p];
					}
					results.push(TweenLite.fromTo(targets[i], duration, from, difs));
				}
			}
			return results;
		};

		TweenPlugin.activate([CSSPlugin]);
		return CSSPlugin;

	}, true);

	
	
	
	
	
	
	
	
	
	
/*
 * ----------------------------------------------------------------
 * RoundPropsPlugin
 * ----------------------------------------------------------------
 */
	(function() {

		var RoundPropsPlugin = _gsScope._gsDefine.plugin({
				propName: "roundProps",
				version: "1.6.0",
				priority: -1,
				API: 2,

				//called when the tween renders for the first time. This is where initial values should be recorded and any setup routines should run.
				init: function(target, value, tween) {
					this._tween = tween;
					return true;
				}

			}),
			_roundLinkedList = function(node) {
				while (node) {
					if (!node.f && !node.blob) {
						node.m = Math.round;
					}
					node = node._next;
				}
			},
			p = RoundPropsPlugin.prototype;

		p._onInitAllProps = function() {
			var tween = this._tween,
				rp = (tween.vars.roundProps.join) ? tween.vars.roundProps : tween.vars.roundProps.split(","),
				i = rp.length,
				lookup = {},
				rpt = tween._propLookup.roundProps,
				prop, pt, next;
			while (--i > -1) {
				lookup[rp[i]] = Math.round;
			}
			i = rp.length;
			while (--i > -1) {
				prop = rp[i];
				pt = tween._firstPT;
				while (pt) {
					next = pt._next; //record here, because it may get removed
					if (pt.pg) {
						pt.t._mod(lookup);
					} else if (pt.n === prop) {
						if (pt.f === 2 && pt.t) { //a blob (text containing multiple numeric values)
							_roundLinkedList(pt.t._firstPT);
						} else {
							this._add(pt.t, prop, pt.s, pt.c);
							//remove from linked list
							if (next) {
								next._prev = pt._prev;
							}
							if (pt._prev) {
								pt._prev._next = next;
							} else if (tween._firstPT === pt) {
								tween._firstPT = next;
							}
							pt._next = pt._prev = null;
							tween._propLookup[prop] = rpt;
						}
					}
					pt = next;
				}
			}
			return false;
		};

		p._add = function(target, p, s, c) {
			this._addTween(target, p, s, s + c, p, Math.round);
			this._overwriteProps.push(p);
		};

	}());










/*
 * ----------------------------------------------------------------
 * AttrPlugin
 * ----------------------------------------------------------------
 */

	(function() {

		_gsScope._gsDefine.plugin({
			propName: "attr",
			API: 2,
			version: "0.6.0",

			//called when the tween renders for the first time. This is where initial values should be recorded and any setup routines should run.
			init: function(target, value, tween, index) {
				var p, end;
				if (typeof(target.setAttribute) !== "function") {
					return false;
				}
				for (p in value) {
					end = value[p];
					if (typeof(end) === "function") {
						end = end(index, target);
					}
					this._addTween(target, "setAttribute", target.getAttribute(p) + "", end + "", p, false, p);
					this._overwriteProps.push(p);
				}
				return true;
			}

		});

	}());










/*
 * ----------------------------------------------------------------
 * DirectionalRotationPlugin
 * ----------------------------------------------------------------
 */
	_gsScope._gsDefine.plugin({
		propName: "directionalRotation",
		version: "0.3.0",
		API: 2,

		//called when the tween renders for the first time. This is where initial values should be recorded and any setup routines should run.
		init: function(target, value, tween, index) {
			if (typeof(value) !== "object") {
				value = {rotation:value};
			}
			this.finals = {};
			var cap = (value.useRadians === true) ? Math.PI * 2 : 360,
				min = 0.000001,
				p, v, start, end, dif, split;
			for (p in value) {
				if (p !== "useRadians") {
					end = value[p];
					if (typeof(end) === "function") {
						end = end(index, target);
					}
					split = (end + "").split("_");
					v = split[0];
					start = parseFloat( (typeof(target[p]) !== "function") ? target[p] : target[ ((p.indexOf("set") || typeof(target["get" + p.substr(3)]) !== "function") ? p : "get" + p.substr(3)) ]() );
					end = this.finals[p] = (typeof(v) === "string" && v.charAt(1) === "=") ? start + parseInt(v.charAt(0) + "1", 10) * Number(v.substr(2)) : Number(v) || 0;
					dif = end - start;
					if (split.length) {
						v = split.join("_");
						if (v.indexOf("short") !== -1) {
							dif = dif % cap;
							if (dif !== dif % (cap / 2)) {
								dif = (dif < 0) ? dif + cap : dif - cap;
							}
						}
						if (v.indexOf("_cw") !== -1 && dif < 0) {
							dif = ((dif + cap * 9999999999) % cap) - ((dif / cap) | 0) * cap;
						} else if (v.indexOf("ccw") !== -1 && dif > 0) {
							dif = ((dif - cap * 9999999999) % cap) - ((dif / cap) | 0) * cap;
						}
					}
					if (dif > min || dif < -min) {
						this._addTween(target, p, start, start + dif, p);
						this._overwriteProps.push(p);
					}
				}
			}
			return true;
		},

		//called each time the values should be updated, and the ratio gets passed as the only parameter (typically it's a value between 0 and 1, but it can exceed those when using an ease like Elastic.easeOut or Back.easeOut, etc.)
		set: function(ratio) {
			var pt;
			if (ratio !== 1) {
				this._super.setRatio.call(this, ratio);
			} else {
				pt = this._firstPT;
				while (pt) {
					if (pt.f) {
						pt.t[pt.p](this.finals[pt.p]);
					} else {
						pt.t[pt.p] = this.finals[pt.p];
					}
					pt = pt._next;
				}
			}
		}

	})._autoCSS = true;







	
	
	
	
/*
 * ----------------------------------------------------------------
 * EasePack
 * ----------------------------------------------------------------
 */
	_gsScope._gsDefine("easing.Back", ["easing.Ease"], function(Ease) {
		
		var w = (_gsScope.GreenSockGlobals || _gsScope),
			gs = w.com.greensock,
			_2PI = Math.PI * 2,
			_HALF_PI = Math.PI / 2,
			_class = gs._class,
			_create = function(n, f) {
				var C = _class("easing." + n, function(){}, true),
					p = C.prototype = new Ease();
				p.constructor = C;
				p.getRatio = f;
				return C;
			},
			_easeReg = Ease.register || function(){}, //put an empty function in place just as a safety measure in case someone loads an OLD version of TweenLite.js where Ease.register doesn't exist.
			_wrap = function(name, EaseOut, EaseIn, EaseInOut, aliases) {
				var C = _class("easing."+name, {
					easeOut:new EaseOut(),
					easeIn:new EaseIn(),
					easeInOut:new EaseInOut()
				}, true);
				_easeReg(C, name);
				return C;
			},
			EasePoint = function(time, value, next) {
				this.t = time;
				this.v = value;
				if (next) {
					this.next = next;
					next.prev = this;
					this.c = next.v - value;
					this.gap = next.t - time;
				}
			},

			//Back
			_createBack = function(n, f) {
				var C = _class("easing." + n, function(overshoot) {
						this._p1 = (overshoot || overshoot === 0) ? overshoot : 1.70158;
						this._p2 = this._p1 * 1.525;
					}, true),
					p = C.prototype = new Ease();
				p.constructor = C;
				p.getRatio = f;
				p.config = function(overshoot) {
					return new C(overshoot);
				};
				return C;
			},

			Back = _wrap("Back",
				_createBack("BackOut", function(p) {
					return ((p = p - 1) * p * ((this._p1 + 1) * p + this._p1) + 1);
				}),
				_createBack("BackIn", function(p) {
					return p * p * ((this._p1 + 1) * p - this._p1);
				}),
				_createBack("BackInOut", function(p) {
					return ((p *= 2) < 1) ? 0.5 * p * p * ((this._p2 + 1) * p - this._p2) : 0.5 * ((p -= 2) * p * ((this._p2 + 1) * p + this._p2) + 2);
				})
			),


			//SlowMo
			SlowMo = _class("easing.SlowMo", function(linearRatio, power, yoyoMode) {
				power = (power || power === 0) ? power : 0.7;
				if (linearRatio == null) {
					linearRatio = 0.7;
				} else if (linearRatio > 1) {
					linearRatio = 1;
				}
				this._p = (linearRatio !== 1) ? power : 0;
				this._p1 = (1 - linearRatio) / 2;
				this._p2 = linearRatio;
				this._p3 = this._p1 + this._p2;
				this._calcEnd = (yoyoMode === true);
			}, true),
			p = SlowMo.prototype = new Ease(),
			SteppedEase, RoughEase, _createElastic;

		p.constructor = SlowMo;
		p.getRatio = function(p) {
			var r = p + (0.5 - p) * this._p;
			if (p < this._p1) {
				return this._calcEnd ? 1 - ((p = 1 - (p / this._p1)) * p) : r - ((p = 1 - (p / this._p1)) * p * p * p * r);
			} else if (p > this._p3) {
				return this._calcEnd ? 1 - (p = (p - this._p3) / this._p1) * p : r + ((p - r) * (p = (p - this._p3) / this._p1) * p * p * p);
			}
			return this._calcEnd ? 1 : r;
		};
		SlowMo.ease = new SlowMo(0.7, 0.7);

		p.config = SlowMo.config = function(linearRatio, power, yoyoMode) {
			return new SlowMo(linearRatio, power, yoyoMode);
		};


		//SteppedEase
		SteppedEase = _class("easing.SteppedEase", function(steps) {
				steps = steps || 1;
				this._p1 = 1 / steps;
				this._p2 = steps + 1;
			}, true);
		p = SteppedEase.prototype = new Ease();
		p.constructor = SteppedEase;
		p.getRatio = function(p) {
			if (p < 0) {
				p = 0;
			} else if (p >= 1) {
				p = 0.999999999;
			}
			return ((this._p2 * p) >> 0) * this._p1;
		};
		p.config = SteppedEase.config = function(steps) {
			return new SteppedEase(steps);
		};


		//RoughEase
		RoughEase = _class("easing.RoughEase", function(vars) {
			vars = vars || {};
			var taper = vars.taper || "none",
				a = [],
				cnt = 0,
				points = (vars.points || 20) | 0,
				i = points,
				randomize = (vars.randomize !== false),
				clamp = (vars.clamp === true),
				template = (vars.template instanceof Ease) ? vars.template : null,
				strength = (typeof(vars.strength) === "number") ? vars.strength * 0.4 : 0.4,
				x, y, bump, invX, obj, pnt;
			while (--i > -1) {
				x = randomize ? Math.random() : (1 / points) * i;
				y = template ? template.getRatio(x) : x;
				if (taper === "none") {
					bump = strength;
				} else if (taper === "out") {
					invX = 1 - x;
					bump = invX * invX * strength;
				} else if (taper === "in") {
					bump = x * x * strength;
				} else if (x < 0.5) {  //"both" (start)
					invX = x * 2;
					bump = invX * invX * 0.5 * strength;
				} else {				//"both" (end)
					invX = (1 - x) * 2;
					bump = invX * invX * 0.5 * strength;
				}
				if (randomize) {
					y += (Math.random() * bump) - (bump * 0.5);
				} else if (i % 2) {
					y += bump * 0.5;
				} else {
					y -= bump * 0.5;
				}
				if (clamp) {
					if (y > 1) {
						y = 1;
					} else if (y < 0) {
						y = 0;
					}
				}
				a[cnt++] = {x:x, y:y};
			}
			a.sort(function(a, b) {
				return a.x - b.x;
			});

			pnt = new EasePoint(1, 1, null);
			i = points;
			while (--i > -1) {
				obj = a[i];
				pnt = new EasePoint(obj.x, obj.y, pnt);
			}

			this._prev = new EasePoint(0, 0, (pnt.t !== 0) ? pnt : pnt.next);
		}, true);
		p = RoughEase.prototype = new Ease();
		p.constructor = RoughEase;
		p.getRatio = function(p) {
			var pnt = this._prev;
			if (p > pnt.t) {
				while (pnt.next && p >= pnt.t) {
					pnt = pnt.next;
				}
				pnt = pnt.prev;
			} else {
				while (pnt.prev && p <= pnt.t) {
					pnt = pnt.prev;
				}
			}
			this._prev = pnt;
			return (pnt.v + ((p - pnt.t) / pnt.gap) * pnt.c);
		};
		p.config = function(vars) {
			return new RoughEase(vars);
		};
		RoughEase.ease = new RoughEase();


		//Bounce
		_wrap("Bounce",
			_create("BounceOut", function(p) {
				if (p < 1 / 2.75) {
					return 7.5625 * p * p;
				} else if (p < 2 / 2.75) {
					return 7.5625 * (p -= 1.5 / 2.75) * p + 0.75;
				} else if (p < 2.5 / 2.75) {
					return 7.5625 * (p -= 2.25 / 2.75) * p + 0.9375;
				}
				return 7.5625 * (p -= 2.625 / 2.75) * p + 0.984375;
			}),
			_create("BounceIn", function(p) {
				if ((p = 1 - p) < 1 / 2.75) {
					return 1 - (7.5625 * p * p);
				} else if (p < 2 / 2.75) {
					return 1 - (7.5625 * (p -= 1.5 / 2.75) * p + 0.75);
				} else if (p < 2.5 / 2.75) {
					return 1 - (7.5625 * (p -= 2.25 / 2.75) * p + 0.9375);
				}
				return 1 - (7.5625 * (p -= 2.625 / 2.75) * p + 0.984375);
			}),
			_create("BounceInOut", function(p) {
				var invert = (p < 0.5);
				if (invert) {
					p = 1 - (p * 2);
				} else {
					p = (p * 2) - 1;
				}
				if (p < 1 / 2.75) {
					p = 7.5625 * p * p;
				} else if (p < 2 / 2.75) {
					p = 7.5625 * (p -= 1.5 / 2.75) * p + 0.75;
				} else if (p < 2.5 / 2.75) {
					p = 7.5625 * (p -= 2.25 / 2.75) * p + 0.9375;
				} else {
					p = 7.5625 * (p -= 2.625 / 2.75) * p + 0.984375;
				}
				return invert ? (1 - p) * 0.5 : p * 0.5 + 0.5;
			})
		);


		//CIRC
		_wrap("Circ",
			_create("CircOut", function(p) {
				return Math.sqrt(1 - (p = p - 1) * p);
			}),
			_create("CircIn", function(p) {
				return -(Math.sqrt(1 - (p * p)) - 1);
			}),
			_create("CircInOut", function(p) {
				return ((p*=2) < 1) ? -0.5 * (Math.sqrt(1 - p * p) - 1) : 0.5 * (Math.sqrt(1 - (p -= 2) * p) + 1);
			})
		);


		//Elastic
		_createElastic = function(n, f, def) {
			var C = _class("easing." + n, function(amplitude, period) {
					this._p1 = (amplitude >= 1) ? amplitude : 1; //note: if amplitude is < 1, we simply adjust the period for a more natural feel. Otherwise the math doesn't work right and the curve starts at 1.
					this._p2 = (period || def) / (amplitude < 1 ? amplitude : 1);
					this._p3 = this._p2 / _2PI * (Math.asin(1 / this._p1) || 0);
					this._p2 = _2PI / this._p2; //precalculate to optimize
				}, true),
				p = C.prototype = new Ease();
			p.constructor = C;
			p.getRatio = f;
			p.config = function(amplitude, period) {
				return new C(amplitude, period);
			};
			return C;
		};
		_wrap("Elastic",
			_createElastic("ElasticOut", function(p) {
				return this._p1 * Math.pow(2, -10 * p) * Math.sin( (p - this._p3) * this._p2 ) + 1;
			}, 0.3),
			_createElastic("ElasticIn", function(p) {
				return -(this._p1 * Math.pow(2, 10 * (p -= 1)) * Math.sin( (p - this._p3) * this._p2 ));
			}, 0.3),
			_createElastic("ElasticInOut", function(p) {
				return ((p *= 2) < 1) ? -0.5 * (this._p1 * Math.pow(2, 10 * (p -= 1)) * Math.sin( (p - this._p3) * this._p2)) : this._p1 * Math.pow(2, -10 *(p -= 1)) * Math.sin( (p - this._p3) * this._p2 ) * 0.5 + 1;
			}, 0.45)
		);


		//Expo
		_wrap("Expo",
			_create("ExpoOut", function(p) {
				return 1 - Math.pow(2, -10 * p);
			}),
			_create("ExpoIn", function(p) {
				return Math.pow(2, 10 * (p - 1)) - 0.001;
			}),
			_create("ExpoInOut", function(p) {
				return ((p *= 2) < 1) ? 0.5 * Math.pow(2, 10 * (p - 1)) : 0.5 * (2 - Math.pow(2, -10 * (p - 1)));
			})
		);


		//Sine
		_wrap("Sine",
			_create("SineOut", function(p) {
				return Math.sin(p * _HALF_PI);
			}),
			_create("SineIn", function(p) {
				return -Math.cos(p * _HALF_PI) + 1;
			}),
			_create("SineInOut", function(p) {
				return -0.5 * (Math.cos(Math.PI * p) - 1);
			})
		);

		_class("easing.EaseLookup", {
				find:function(s) {
					return Ease.map[s];
				}
			}, true);

		//register the non-standard eases
		_easeReg(w.SlowMo, "SlowMo", "ease,");
		_easeReg(RoughEase, "RoughEase", "ease,");
		_easeReg(SteppedEase, "SteppedEase", "ease,");

		return Back;
		
	}, true);


});

if (_gsScope._gsDefine) { _gsScope._gsQueue.pop()(); } //necessary in case TweenLite was already loaded separately.











/*
 * ----------------------------------------------------------------
 * Base classes like TweenLite, SimpleTimeline, Ease, Ticker, etc.
 * ----------------------------------------------------------------
 */
(function(window, moduleName) {

		"use strict";
		var _exports = {},
			_doc = window.document,
			_globals = window.GreenSockGlobals = window.GreenSockGlobals || window;
		if (_globals.TweenLite) {
			return; //in case the core set of classes is already loaded, don't instantiate twice.
		}
		var _namespace = function(ns) {
				var a = ns.split("."),
					p = _globals, i;
				for (i = 0; i < a.length; i++) {
					p[a[i]] = p = p[a[i]] || {};
				}
				return p;
			},
			gs = _namespace("com.greensock"),
			_tinyNum = 0.0000000001,
			_slice = function(a) { //don't use Array.prototype.slice.call(target, 0) because that doesn't work in IE8 with a NodeList that's returned by querySelectorAll()
				var b = [],
					l = a.length,
					i;
				for (i = 0; i !== l; b.push(a[i++])) {}
				return b;
			},
			_emptyFunc = function() {},
			_isArray = (function() { //works around issues in iframe environments where the Array global isn't shared, thus if the object originates in a different window/iframe, "(obj instanceof Array)" will evaluate false. We added some speed optimizations to avoid Object.prototype.toString.call() unless it's absolutely necessary because it's VERY slow (like 20x slower)
				var toString = Object.prototype.toString,
					array = toString.call([]);
				return function(obj) {
					return obj != null && (obj instanceof Array || (typeof(obj) === "object" && !!obj.push && toString.call(obj) === array));
				};
			}()),
			a, i, p, _ticker, _tickerActive,
			_defLookup = {},

			/**
			 * @constructor
			 * Defines a GreenSock class, optionally with an array of dependencies that must be instantiated first and passed into the definition.
			 * This allows users to load GreenSock JS files in any order even if they have interdependencies (like CSSPlugin extends TweenPlugin which is
			 * inside TweenLite.js, but if CSSPlugin is loaded first, it should wait to run its code until TweenLite.js loads and instantiates TweenPlugin
			 * and then pass TweenPlugin to CSSPlugin's definition). This is all done automatically and internally.
			 *
			 * Every definition will be added to a "com.greensock" global object (typically window, but if a window.GreenSockGlobals object is found,
			 * it will go there as of v1.7). For example, TweenLite will be found at window.com.greensock.TweenLite and since it's a global class that should be available anywhere,
			 * it is ALSO referenced at window.TweenLite. However some classes aren't considered global, like the base com.greensock.core.Animation class, so
			 * those will only be at the package like window.com.greensock.core.Animation. Again, if you define a GreenSockGlobals object on the window, everything
			 * gets tucked neatly inside there instead of on the window directly. This allows you to do advanced things like load multiple versions of GreenSock
			 * files and put them into distinct objects (imagine a banner ad uses a newer version but the main site uses an older one). In that case, you could
			 * sandbox the banner one like:
			 *
			 * <script>
			 *     var gs = window.GreenSockGlobals = {}; //the newer version we're about to load could now be referenced in a "gs" object, like gs.TweenLite.to(...). Use whatever alias you want as long as it's unique, "gs" or "banner" or whatever.
			 * </script>
			 * <script src="js/greensock/v1.7/TweenMax.js"></script>
			 * <script>
			 *     window.GreenSockGlobals = window._gsQueue = window._gsDefine = null; //reset it back to null (along with the special _gsQueue variable) so that the next load of TweenMax affects the window and we can reference things directly like TweenLite.to(...)
			 * </script>
			 * <script src="js/greensock/v1.6/TweenMax.js"></script>
			 * <script>
			 *     gs.TweenLite.to(...); //would use v1.7
			 *     TweenLite.to(...); //would use v1.6
			 * </script>
			 *
			 * @param {!string} ns The namespace of the class definition, leaving off "com.greensock." as that's assumed. For example, "TweenLite" or "plugins.CSSPlugin" or "easing.Back".
			 * @param {!Array.<string>} dependencies An array of dependencies (described as their namespaces minus "com.greensock." prefix). For example ["TweenLite","plugins.TweenPlugin","core.Animation"]
			 * @param {!function():Object} func The function that should be called and passed the resolved dependencies which will return the actual class for this definition.
			 * @param {boolean=} global If true, the class will be added to the global scope (typically window unless you define a window.GreenSockGlobals object)
			 */
			Definition = function(ns, dependencies, func, global) {
				this.sc = (_defLookup[ns]) ? _defLookup[ns].sc : []; //subclasses
				_defLookup[ns] = this;
				this.gsClass = null;
				this.func = func;
				var _classes = [];
				this.check = function(init) {
					var i = dependencies.length,
						missing = i,
						cur, a, n, cl, hasModule;
					while (--i > -1) {
						if ((cur = _defLookup[dependencies[i]] || new Definition(dependencies[i], [])).gsClass) {
							_classes[i] = cur.gsClass;
							missing--;
						} else if (init) {
							cur.sc.push(this);
						}
					}
					if (missing === 0 && func) {
						a = ("com.greensock." + ns).split(".");
						n = a.pop();
						cl = _namespace(a.join("."))[n] = this.gsClass = func.apply(func, _classes);

						//exports to multiple environments
						if (global) {
							_globals[n] = _exports[n] = cl; //provides a way to avoid global namespace pollution. By default, the main classes like TweenLite, Power1, Strong, etc. are added to window unless a GreenSockGlobals is defined. So if you want to have things added to a custom object instead, just do something like window.GreenSockGlobals = {} before loading any GreenSock files. You can even set up an alias like window.GreenSockGlobals = windows.gs = {} so that you can access everything like gs.TweenLite. Also remember that ALL classes are added to the window.com.greensock object (in their respective packages, like com.greensock.easing.Power1, com.greensock.TweenLite, etc.)
							hasModule = (typeof(module) !== "undefined" && module.exports);
							if (!hasModule && typeof(define) === "function" && define.amd){ //AMD
								define((window.GreenSockAMDPath ? window.GreenSockAMDPath + "/" : "") + ns.split(".").pop(), [], function() { return cl; });
							} else if (hasModule){ //node
								if (ns === moduleName) {
									module.exports = _exports[moduleName] = cl;
									for (i in _exports) {
										cl[i] = _exports[i];
									}
								} else if (_exports[moduleName]) {
									_exports[moduleName][n] = cl;
								}
							}
						}
						for (i = 0; i < this.sc.length; i++) {
							this.sc[i].check();
						}
					}
				};
				this.check(true);
			},

			//used to create Definition instances (which basically registers a class that has dependencies).
			_gsDefine = window._gsDefine = function(ns, dependencies, func, global) {
				return new Definition(ns, dependencies, func, global);
			},

			//a quick way to create a class that doesn't have any dependencies. Returns the class, but first registers it in the GreenSock namespace so that other classes can grab it (other classes might be dependent on the class).
			_class = gs._class = function(ns, func, global) {
				func = func || function() {};
				_gsDefine(ns, [], function(){ return func; }, global);
				return func;
			};

		_gsDefine.globals = _globals;



/*
 * ----------------------------------------------------------------
 * Ease
 * ----------------------------------------------------------------
 */
		var _baseParams = [0, 0, 1, 1],
			_blankArray = [],
			Ease = _class("easing.Ease", function(func, extraParams, type, power) {
				this._func = func;
				this._type = type || 0;
				this._power = power || 0;
				this._params = extraParams ? _baseParams.concat(extraParams) : _baseParams;
			}, true),
			_easeMap = Ease.map = {},
			_easeReg = Ease.register = function(ease, names, types, create) {
				var na = names.split(","),
					i = na.length,
					ta = (types || "easeIn,easeOut,easeInOut").split(","),
					e, name, j, type;
				while (--i > -1) {
					name = na[i];
					e = create ? _class("easing."+name, null, true) : gs.easing[name] || {};
					j = ta.length;
					while (--j > -1) {
						type = ta[j];
						_easeMap[name + "." + type] = _easeMap[type + name] = e[type] = ease.getRatio ? ease : ease[type] || new ease();
					}
				}
			};

		p = Ease.prototype;
		p._calcEnd = false;
		p.getRatio = function(p) {
			if (this._func) {
				this._params[0] = p;
				return this._func.apply(null, this._params);
			}
			var t = this._type,
				pw = this._power,
				r = (t === 1) ? 1 - p : (t === 2) ? p : (p < 0.5) ? p * 2 : (1 - p) * 2;
			if (pw === 1) {
				r *= r;
			} else if (pw === 2) {
				r *= r * r;
			} else if (pw === 3) {
				r *= r * r * r;
			} else if (pw === 4) {
				r *= r * r * r * r;
			}
			return (t === 1) ? 1 - r : (t === 2) ? r : (p < 0.5) ? r / 2 : 1 - (r / 2);
		};

		//create all the standard eases like Linear, Quad, Cubic, Quart, Quint, Strong, Power0, Power1, Power2, Power3, and Power4 (each with easeIn, easeOut, and easeInOut)
		a = ["Linear","Quad","Cubic","Quart","Quint,Strong"];
		i = a.length;
		while (--i > -1) {
			p = a[i]+",Power"+i;
			_easeReg(new Ease(null,null,1,i), p, "easeOut", true);
			_easeReg(new Ease(null,null,2,i), p, "easeIn" + ((i === 0) ? ",easeNone" : ""));
			_easeReg(new Ease(null,null,3,i), p, "easeInOut");
		}
		_easeMap.linear = gs.easing.Linear.easeIn;
		_easeMap.swing = gs.easing.Quad.easeInOut; //for jQuery folks


/*
 * ----------------------------------------------------------------
 * EventDispatcher
 * ----------------------------------------------------------------
 */
		var EventDispatcher = _class("events.EventDispatcher", function(target) {
			this._listeners = {};
			this._eventTarget = target || this;
		});
		p = EventDispatcher.prototype;

		p.addEventListener = function(type, callback, scope, useParam, priority) {
			priority = priority || 0;
			var list = this._listeners[type],
				index = 0,
				listener, i;
			if (this === _ticker && !_tickerActive) {
				_ticker.wake();
			}
			if (list == null) {
				this._listeners[type] = list = [];
			}
			i = list.length;
			while (--i > -1) {
				listener = list[i];
				if (listener.c === callback && listener.s === scope) {
					list.splice(i, 1);
				} else if (index === 0 && listener.pr < priority) {
					index = i + 1;
				}
			}
			list.splice(index, 0, {c:callback, s:scope, up:useParam, pr:priority});
		};

		p.removeEventListener = function(type, callback) {
			var list = this._listeners[type], i;
			if (list) {
				i = list.length;
				while (--i > -1) {
					if (list[i].c === callback) {
						list.splice(i, 1);
						return;
					}
				}
			}
		};

		p.dispatchEvent = function(type) {
			var list = this._listeners[type],
				i, t, listener;
			if (list) {
				i = list.length;
				if (i > 1) {
					list = list.slice(0); //in case addEventListener() is called from within a listener/callback (otherwise the index could change, resulting in a skip)
				}
				t = this._eventTarget;
				while (--i > -1) {
					listener = list[i];
					if (listener) {
						if (listener.up) {
							listener.c.call(listener.s || t, {type:type, target:t});
						} else {
							listener.c.call(listener.s || t);
						}
					}
				}
			}
		};


/*
 * ----------------------------------------------------------------
 * Ticker
 * ----------------------------------------------------------------
 */
 		var _reqAnimFrame = window.requestAnimationFrame,
			_cancelAnimFrame = window.cancelAnimationFrame,
			_getTime = Date.now || function() {return new Date().getTime();},
			_lastUpdate = _getTime();

		//now try to determine the requestAnimationFrame and cancelAnimationFrame functions and if none are found, we'll use a setTimeout()/clearTimeout() polyfill.
		a = ["ms","moz","webkit","o"];
		i = a.length;
		while (--i > -1 && !_reqAnimFrame) {
			_reqAnimFrame = window[a[i] + "RequestAnimationFrame"];
			_cancelAnimFrame = window[a[i] + "CancelAnimationFrame"] || window[a[i] + "CancelRequestAnimationFrame"];
		}

		_class("Ticker", function(fps, useRAF) {
			var _self = this,
				_startTime = _getTime(),
				_useRAF = (useRAF !== false && _reqAnimFrame) ? "auto" : false,
				_lagThreshold = 500,
				_adjustedLag = 33,
				_tickWord = "tick", //helps reduce gc burden
				_fps, _req, _id, _gap, _nextTime,
				_tick = function(manual) {
					var elapsed = _getTime() - _lastUpdate,
						overlap, dispatch;
					if (elapsed > _lagThreshold) {
						_startTime += elapsed - _adjustedLag;
					}
					_lastUpdate += elapsed;
					_self.time = (_lastUpdate - _startTime) / 1000;
					overlap = _self.time - _nextTime;
					if (!_fps || overlap > 0 || manual === true) {
						_self.frame++;
						_nextTime += overlap + (overlap >= _gap ? 0.004 : _gap - overlap);
						dispatch = true;
					}
					if (manual !== true) { //make sure the request is made before we dispatch the "tick" event so that timing is maintained. Otherwise, if processing the "tick" requires a bunch of time (like 15ms) and we're using a setTimeout() that's based on 16.7ms, it'd technically take 31.7ms between frames otherwise.
						_id = _req(_tick);
					}
					if (dispatch) {
						_self.dispatchEvent(_tickWord);
					}
				};

			EventDispatcher.call(_self);
			_self.time = _self.frame = 0;
			_self.tick = function() {
				_tick(true);
			};

			_self.lagSmoothing = function(threshold, adjustedLag) {
				_lagThreshold = threshold || (1 / _tinyNum); //zero should be interpreted as basically unlimited
				_adjustedLag = Math.min(adjustedLag, _lagThreshold, 0);
			};

			_self.sleep = function() {
				if (_id == null) {
					return;
				}
				if (!_useRAF || !_cancelAnimFrame) {
					clearTimeout(_id);
				} else {
					_cancelAnimFrame(_id);
				}
				_req = _emptyFunc;
				_id = null;
				if (_self === _ticker) {
					_tickerActive = false;
				}
			};

			_self.wake = function(seamless) {
				if (_id !== null) {
					_self.sleep();
				} else if (seamless) {
					_startTime += -_lastUpdate + (_lastUpdate = _getTime());
				} else if (_self.frame > 10) { //don't trigger lagSmoothing if we're just waking up, and make sure that at least 10 frames have elapsed because of the iOS bug that we work around below with the 1.5-second setTimout().
					_lastUpdate = _getTime() - _lagThreshold + 5;
				}
				_req = (_fps === 0) ? _emptyFunc : (!_useRAF || !_reqAnimFrame) ? function(f) { return setTimeout(f, ((_nextTime - _self.time) * 1000 + 1) | 0); } : _reqAnimFrame;
				if (_self === _ticker) {
					_tickerActive = true;
				}
				_tick(2);
			};

			_self.fps = function(value) {
				if (!arguments.length) {
					return _fps;
				}
				_fps = value;
				_gap = 1 / (_fps || 60);
				_nextTime = this.time + _gap;
				_self.wake();
			};

			_self.useRAF = function(value) {
				if (!arguments.length) {
					return _useRAF;
				}
				_self.sleep();
				_useRAF = value;
				_self.fps(_fps);
			};
			_self.fps(fps);

			//a bug in iOS 6 Safari occasionally prevents the requestAnimationFrame from working initially, so we use a 1.5-second timeout that automatically falls back to setTimeout() if it senses this condition.
			setTimeout(function() {
				if (_useRAF === "auto" && _self.frame < 5 && _doc.visibilityState !== "hidden") {
					_self.useRAF(false);
				}
			}, 1500);
		});

		p = gs.Ticker.prototype = new gs.events.EventDispatcher();
		p.constructor = gs.Ticker;


/*
 * ----------------------------------------------------------------
 * Animation
 * ----------------------------------------------------------------
 */
		var Animation = _class("core.Animation", function(duration, vars) {
				this.vars = vars = vars || {};
				this._duration = this._totalDuration = duration || 0;
				this._delay = Number(vars.delay) || 0;
				this._timeScale = 1;
				this._active = (vars.immediateRender === true);
				this.data = vars.data;
				this._reversed = (vars.reversed === true);

				if (!_rootTimeline) {
					return;
				}
				if (!_tickerActive) { //some browsers (like iOS 6 Safari) shut down JavaScript execution when the tab is disabled and they [occasionally] neglect to start up requestAnimationFrame again when returning - this code ensures that the engine starts up again properly.
					_ticker.wake();
				}

				var tl = this.vars.useFrames ? _rootFramesTimeline : _rootTimeline;
				tl.add(this, tl._time);

				if (this.vars.paused) {
					this.paused(true);
				}
			});

		_ticker = Animation.ticker = new gs.Ticker();
		p = Animation.prototype;
		p._dirty = p._gc = p._initted = p._paused = false;
		p._totalTime = p._time = 0;
		p._rawPrevTime = -1;
		p._next = p._last = p._onUpdate = p._timeline = p.timeline = null;
		p._paused = false;


		//some browsers (like iOS) occasionally drop the requestAnimationFrame event when the user switches to a different tab and then comes back again, so we use a 2-second setTimeout() to sense if/when that condition occurs and then wake() the ticker.
		var _checkTimeout = function() {
				if (_tickerActive && _getTime() - _lastUpdate > 2000) {
					_ticker.wake();
				}
				setTimeout(_checkTimeout, 2000);
			};
		_checkTimeout();


		p.play = function(from, suppressEvents) {
			if (from != null) {
				this.seek(from, suppressEvents);
			}
			return this.reversed(false).paused(false);
		};

		p.pause = function(atTime, suppressEvents) {
			if (atTime != null) {
				this.seek(atTime, suppressEvents);
			}
			return this.paused(true);
		};

		p.resume = function(from, suppressEvents) {
			if (from != null) {
				this.seek(from, suppressEvents);
			}
			return this.paused(false);
		};

		p.seek = function(time, suppressEvents) {
			return this.totalTime(Number(time), suppressEvents !== false);
		};

		p.restart = function(includeDelay, suppressEvents) {
			return this.reversed(false).paused(false).totalTime(includeDelay ? -this._delay : 0, (suppressEvents !== false), true);
		};

		p.reverse = function(from, suppressEvents) {
			if (from != null) {
				this.seek((from || this.totalDuration()), suppressEvents);
			}
			return this.reversed(true).paused(false);
		};

		p.render = function(time, suppressEvents, force) {
			//stub - we override this method in subclasses.
		};

		p.invalidate = function() {
			this._time = this._totalTime = 0;
			this._initted = this._gc = false;
			this._rawPrevTime = -1;
			if (this._gc || !this.timeline) {
				this._enabled(true);
			}
			return this;
		};

		p.isActive = function() {
			var tl = this._timeline, //the 2 root timelines won't have a _timeline; they're always active.
				startTime = this._startTime,
				rawTime;
			return (!tl || (!this._gc && !this._paused && tl.isActive() && (rawTime = tl.rawTime(true)) >= startTime && rawTime < startTime + this.totalDuration() / this._timeScale));
		};

		p._enabled = function (enabled, ignoreTimeline) {
			if (!_tickerActive) {
				_ticker.wake();
			}
			this._gc = !enabled;
			this._active = this.isActive();
			if (ignoreTimeline !== true) {
				if (enabled && !this.timeline) {
					this._timeline.add(this, this._startTime - this._delay);
				} else if (!enabled && this.timeline) {
					this._timeline._remove(this, true);
				}
			}
			return false;
		};


		p._kill = function(vars, target) {
			return this._enabled(false, false);
		};

		p.kill = function(vars, target) {
			this._kill(vars, target);
			return this;
		};

		p._uncache = function(includeSelf) {
			var tween = includeSelf ? this : this.timeline;
			while (tween) {
				tween._dirty = true;
				tween = tween.timeline;
			}
			return this;
		};

		p._swapSelfInParams = function(params) {
			var i = params.length,
				copy = params.concat();
			while (--i > -1) {
				if (params[i] === "{self}") {
					copy[i] = this;
				}
			}
			return copy;
		};

		p._callback = function(type) {
			var v = this.vars,
				callback = v[type],
				params = v[type + "Params"],
				scope = v[type + "Scope"] || v.callbackScope || this,
				l = params ? params.length : 0;
			switch (l) { //speed optimization; call() is faster than apply() so use it when there are only a few parameters (which is by far most common). Previously we simply did var v = this.vars; v[type].apply(v[type + "Scope"] || v.callbackScope || this, v[type + "Params"] || _blankArray);
				case 0: callback.call(scope); break;
				case 1: callback.call(scope, params[0]); break;
				case 2: callback.call(scope, params[0], params[1]); break;
				default: callback.apply(scope, params);
			}
		};

//----Animation getters/setters --------------------------------------------------------

		p.eventCallback = function(type, callback, params, scope) {
			if ((type || "").substr(0,2) === "on") {
				var v = this.vars;
				if (arguments.length === 1) {
					return v[type];
				}
				if (callback == null) {
					delete v[type];
				} else {
					v[type] = callback;
					v[type + "Params"] = (_isArray(params) && params.join("").indexOf("{self}") !== -1) ? this._swapSelfInParams(params) : params;
					v[type + "Scope"] = scope;
				}
				if (type === "onUpdate") {
					this._onUpdate = callback;
				}
			}
			return this;
		};

		p.delay = function(value) {
			if (!arguments.length) {
				return this._delay;
			}
			if (this._timeline.smoothChildTiming) {
				this.startTime( this._startTime + value - this._delay );
			}
			this._delay = value;
			return this;
		};

		p.duration = function(value) {
			if (!arguments.length) {
				this._dirty = false;
				return this._duration;
			}
			this._duration = this._totalDuration = value;
			this._uncache(true); //true in case it's a TweenMax or TimelineMax that has a repeat - we'll need to refresh the totalDuration.
			if (this._timeline.smoothChildTiming) if (this._time > 0) if (this._time < this._duration) if (value !== 0) {
				this.totalTime(this._totalTime * (value / this._duration), true);
			}
			return this;
		};

		p.totalDuration = function(value) {
			this._dirty = false;
			return (!arguments.length) ? this._totalDuration : this.duration(value);
		};

		p.time = function(value, suppressEvents) {
			if (!arguments.length) {
				return this._time;
			}
			if (this._dirty) {
				this.totalDuration();
			}
			return this.totalTime((value > this._duration) ? this._duration : value, suppressEvents);
		};

		p.totalTime = function(time, suppressEvents, uncapped) {
			if (!_tickerActive) {
				_ticker.wake();
			}
			if (!arguments.length) {
				return this._totalTime;
			}
			if (this._timeline) {
				if (time < 0 && !uncapped) {
					time += this.totalDuration();
				}
				if (this._timeline.smoothChildTiming) {
					if (this._dirty) {
						this.totalDuration();
					}
					var totalDuration = this._totalDuration,
						tl = this._timeline;
					if (time > totalDuration && !uncapped) {
						time = totalDuration;
					}
					this._startTime = (this._paused ? this._pauseTime : tl._time) - ((!this._reversed ? time : totalDuration - time) / this._timeScale);
					if (!tl._dirty) { //for performance improvement. If the parent's cache is already dirty, it already took care of marking the ancestors as dirty too, so skip the function call here.
						this._uncache(false);
					}
					//in case any of the ancestor timelines had completed but should now be enabled, we should reset their totalTime() which will also ensure that they're lined up properly and enabled. Skip for animations that are on the root (wasteful). Example: a TimelineLite.exportRoot() is performed when there's a paused tween on the root, the export will not complete until that tween is unpaused, but imagine a child gets restarted later, after all [unpaused] tweens have completed. The startTime of that child would get pushed out, but one of the ancestors may have completed.
					if (tl._timeline) {
						while (tl._timeline) {
							if (tl._timeline._time !== (tl._startTime + tl._totalTime) / tl._timeScale) {
								tl.totalTime(tl._totalTime, true);
							}
							tl = tl._timeline;
						}
					}
				}
				if (this._gc) {
					this._enabled(true, false);
				}
				if (this._totalTime !== time || this._duration === 0) {
					if (_lazyTweens.length) {
						_lazyRender();
					}
					this.render(time, suppressEvents, false);
					if (_lazyTweens.length) { //in case rendering caused any tweens to lazy-init, we should render them because typically when someone calls seek() or time() or progress(), they expect an immediate render.
						_lazyRender();
					}
				}
			}
			return this;
		};

		p.progress = p.totalProgress = function(value, suppressEvents) {
			var duration = this.duration();
			return (!arguments.length) ? (duration ? this._time / duration : this.ratio) : this.totalTime(duration * value, suppressEvents);
		};

		p.startTime = function(value) {
			if (!arguments.length) {
				return this._startTime;
			}
			if (value !== this._startTime) {
				this._startTime = value;
				if (this.timeline) if (this.timeline._sortChildren) {
					this.timeline.add(this, value - this._delay); //ensures that any necessary re-sequencing of Animations in the timeline occurs to make sure the rendering order is correct.
				}
			}
			return this;
		};

		p.endTime = function(includeRepeats) {
			return this._startTime + ((includeRepeats != false) ? this.totalDuration() : this.duration()) / this._timeScale;
		};

		p.timeScale = function(value) {
			if (!arguments.length) {
				return this._timeScale;
			}
			value = value || _tinyNum; //can't allow zero because it'll throw the math off
			if (this._timeline && this._timeline.smoothChildTiming) {
				var pauseTime = this._pauseTime,
					t = (pauseTime || pauseTime === 0) ? pauseTime : this._timeline.totalTime();
				this._startTime = t - ((t - this._startTime) * this._timeScale / value);
			}
			this._timeScale = value;
			return this._uncache(false);
		};

		p.reversed = function(value) {
			if (!arguments.length) {
				return this._reversed;
			}
			if (value != this._reversed) {
				this._reversed = value;
				this.totalTime(((this._timeline && !this._timeline.smoothChildTiming) ? this.totalDuration() - this._totalTime : this._totalTime), true);
			}
			return this;
		};

		p.paused = function(value) {
			if (!arguments.length) {
				return this._paused;
			}
			var tl = this._timeline,
				raw, elapsed;
			if (value != this._paused) if (tl) {
				if (!_tickerActive && !value) {
					_ticker.wake();
				}
				raw = tl.rawTime();
				elapsed = raw - this._pauseTime;
				if (!value && tl.smoothChildTiming) {
					this._startTime += elapsed;
					this._uncache(false);
				}
				this._pauseTime = value ? raw : null;
				this._paused = value;
				this._active = this.isActive();
				if (!value && elapsed !== 0 && this._initted && this.duration()) {
					raw = tl.smoothChildTiming ? this._totalTime : (raw - this._startTime) / this._timeScale;
					this.render(raw, (raw === this._totalTime), true); //in case the target's properties changed via some other tween or manual update by the user, we should force a render.
				}
			}
			if (this._gc && !value) {
				this._enabled(true, false);
			}
			return this;
		};


/*
 * ----------------------------------------------------------------
 * SimpleTimeline
 * ----------------------------------------------------------------
 */
		var SimpleTimeline = _class("core.SimpleTimeline", function(vars) {
			Animation.call(this, 0, vars);
			this.autoRemoveChildren = this.smoothChildTiming = true;
		});

		p = SimpleTimeline.prototype = new Animation();
		p.constructor = SimpleTimeline;
		p.kill()._gc = false;
		p._first = p._last = p._recent = null;
		p._sortChildren = false;

		p.add = p.insert = function(child, position, align, stagger) {
			var prevTween, st;
			child._startTime = Number(position || 0) + child._delay;
			if (child._paused) if (this !== child._timeline) { //we only adjust the _pauseTime if it wasn't in this timeline already. Remember, sometimes a tween will be inserted again into the same timeline when its startTime is changed so that the tweens in the TimelineLite/Max are re-ordered properly in the linked list (so everything renders in the proper order).
				child._pauseTime = child._startTime + ((this.rawTime() - child._startTime) / child._timeScale);
			}
			if (child.timeline) {
				child.timeline._remove(child, true); //removes from existing timeline so that it can be properly added to this one.
			}
			child.timeline = child._timeline = this;
			if (child._gc) {
				child._enabled(true, true);
			}
			prevTween = this._last;
			if (this._sortChildren) {
				st = child._startTime;
				while (prevTween && prevTween._startTime > st) {
					prevTween = prevTween._prev;
				}
			}
			if (prevTween) {
				child._next = prevTween._next;
				prevTween._next = child;
			} else {
				child._next = this._first;
				this._first = child;
			}
			if (child._next) {
				child._next._prev = child;
			} else {
				this._last = child;
			}
			child._prev = prevTween;
			this._recent = child;
			if (this._timeline) {
				this._uncache(true);
			}
			return this;
		};

		p._remove = function(tween, skipDisable) {
			if (tween.timeline === this) {
				if (!skipDisable) {
					tween._enabled(false, true);
				}

				if (tween._prev) {
					tween._prev._next = tween._next;
				} else if (this._first === tween) {
					this._first = tween._next;
				}
				if (tween._next) {
					tween._next._prev = tween._prev;
				} else if (this._last === tween) {
					this._last = tween._prev;
				}
				tween._next = tween._prev = tween.timeline = null;
				if (tween === this._recent) {
					this._recent = this._last;
				}

				if (this._timeline) {
					this._uncache(true);
				}
			}
			return this;
		};

		p.render = function(time, suppressEvents, force) {
			var tween = this._first,
				next;
			this._totalTime = this._time = this._rawPrevTime = time;
			while (tween) {
				next = tween._next; //record it here because the value could change after rendering...
				if (tween._active || (time >= tween._startTime && !tween._paused)) {
					if (!tween._reversed) {
						tween.render((time - tween._startTime) * tween._timeScale, suppressEvents, force);
					} else {
						tween.render(((!tween._dirty) ? tween._totalDuration : tween.totalDuration()) - ((time - tween._startTime) * tween._timeScale), suppressEvents, force);
					}
				}
				tween = next;
			}
		};

		p.rawTime = function() {
			if (!_tickerActive) {
				_ticker.wake();
			}
			return this._totalTime;
		};

/*
 * ----------------------------------------------------------------
 * TweenLite
 * ----------------------------------------------------------------
 */
		var TweenLite = _class("TweenLite", function(target, duration, vars) {
				Animation.call(this, duration, vars);
				this.render = TweenLite.prototype.render; //speed optimization (avoid prototype lookup on this "hot" method)

				if (target == null) {
					throw "Cannot tween a null target.";
				}

				this.target = target = (typeof(target) !== "string") ? target : TweenLite.selector(target) || target;

				var isSelector = (target.jquery || (target.length && target !== window && target[0] && (target[0] === window || (target[0].nodeType && target[0].style && !target.nodeType)))),
					overwrite = this.vars.overwrite,
					i, targ, targets;

				this._overwrite = overwrite = (overwrite == null) ? _overwriteLookup[TweenLite.defaultOverwrite] : (typeof(overwrite) === "number") ? overwrite >> 0 : _overwriteLookup[overwrite];

				if ((isSelector || target instanceof Array || (target.push && _isArray(target))) && typeof(target[0]) !== "number") {
					this._targets = targets = _slice(target);  //don't use Array.prototype.slice.call(target, 0) because that doesn't work in IE8 with a NodeList that's returned by querySelectorAll()
					this._propLookup = [];
					this._siblings = [];
					for (i = 0; i < targets.length; i++) {
						targ = targets[i];
						if (!targ) {
							targets.splice(i--, 1);
							continue;
						} else if (typeof(targ) === "string") {
							targ = targets[i--] = TweenLite.selector(targ); //in case it's an array of strings
							if (typeof(targ) === "string") {
								targets.splice(i+1, 1); //to avoid an endless loop (can't imagine why the selector would return a string, but just in case)
							}
							continue;
						} else if (targ.length && targ !== window && targ[0] && (targ[0] === window || (targ[0].nodeType && targ[0].style && !targ.nodeType))) { //in case the user is passing in an array of selector objects (like jQuery objects), we need to check one more level and pull things out if necessary. Also note that <select> elements pass all the criteria regarding length and the first child having style, so we must also check to ensure the target isn't an HTML node itself.
							targets.splice(i--, 1);
							this._targets = targets = targets.concat(_slice(targ));
							continue;
						}
						this._siblings[i] = _register(targ, this, false);
						if (overwrite === 1) if (this._siblings[i].length > 1) {
							_applyOverwrite(targ, this, null, 1, this._siblings[i]);
						}
					}

				} else {
					this._propLookup = {};
					this._siblings = _register(target, this, false);
					if (overwrite === 1) if (this._siblings.length > 1) {
						_applyOverwrite(target, this, null, 1, this._siblings);
					}
				}
				if (this.vars.immediateRender || (duration === 0 && this._delay === 0 && this.vars.immediateRender !== false)) {
					this._time = -_tinyNum; //forces a render without having to set the render() "force" parameter to true because we want to allow lazying by default (using the "force" parameter always forces an immediate full render)
					this.render(Math.min(0, -this._delay)); //in case delay is negative
				}
			}, true),
			_isSelector = function(v) {
				return (v && v.length && v !== window && v[0] && (v[0] === window || (v[0].nodeType && v[0].style && !v.nodeType))); //we cannot check "nodeType" if the target is window from within an iframe, otherwise it will trigger a security error in some browsers like Firefox.
			},
			_autoCSS = function(vars, target) {
				var css = {},
					p;
				for (p in vars) {
					if (!_reservedProps[p] && (!(p in target) || p === "transform" || p === "x" || p === "y" || p === "width" || p === "height" || p === "className" || p === "border") && (!_plugins[p] || (_plugins[p] && _plugins[p]._autoCSS))) { //note: <img> elements contain read-only "x" and "y" properties. We should also prioritize editing css width/height rather than the element's properties.
						css[p] = vars[p];
						delete vars[p];
					}
				}
				vars.css = css;
			};

		p = TweenLite.prototype = new Animation();
		p.constructor = TweenLite;
		p.kill()._gc = false;

//----TweenLite defaults, overwrite management, and root updates ----------------------------------------------------

		p.ratio = 0;
		p._firstPT = p._targets = p._overwrittenProps = p._startAt = null;
		p._notifyPluginsOfEnabled = p._lazy = false;

		TweenLite.version = "1.19.1";
		TweenLite.defaultEase = p._ease = new Ease(null, null, 1, 1);
		TweenLite.defaultOverwrite = "auto";
		TweenLite.ticker = _ticker;
		TweenLite.autoSleep = 120;
		TweenLite.lagSmoothing = function(threshold, adjustedLag) {
			_ticker.lagSmoothing(threshold, adjustedLag);
		};

		TweenLite.selector = window.$ || window.jQuery || function(e) {
			var selector = window.$ || window.jQuery;
			if (selector) {
				TweenLite.selector = selector;
				return selector(e);
			}
			return (typeof(_doc) === "undefined") ? e : (_doc.querySelectorAll ? _doc.querySelectorAll(e) : _doc.getElementById((e.charAt(0) === "#") ? e.substr(1) : e));
		};

		var _lazyTweens = [],
			_lazyLookup = {},
			_numbersExp = /(?:(-|-=|\+=)?\d*\.?\d*(?:e[\-+]?\d+)?)[0-9]/ig,
			//_nonNumbersExp = /(?:([\-+](?!(\d|=)))|[^\d\-+=e]|(e(?![\-+][\d])))+/ig,
			_setRatio = function(v) {
				var pt = this._firstPT,
					min = 0.000001,
					val;
				while (pt) {
					val = !pt.blob ? pt.c * v + pt.s : (v === 1) ? this.end : v ? this.join("") : this.start;
					if (pt.m) {
						val = pt.m(val, this._target || pt.t);
					} else if (val < min) if (val > -min && !pt.blob) { //prevents issues with converting very small numbers to strings in the browser
						val = 0;
					}
					if (!pt.f) {
						pt.t[pt.p] = val;
					} else if (pt.fp) {
						pt.t[pt.p](pt.fp, val);
					} else {
						pt.t[pt.p](val);
					}
					pt = pt._next;
				}
			},
			//compares two strings (start/end), finds the numbers that are different and spits back an array representing the whole value but with the changing values isolated as elements. For example, "rgb(0,0,0)" and "rgb(100,50,0)" would become ["rgb(", 0, ",", 50, ",0)"]. Notice it merges the parts that are identical (performance optimization). The array also has a linked list of PropTweens attached starting with _firstPT that contain the tweening data (t, p, s, c, f, etc.). It also stores the starting value as a "start" property so that we can revert to it if/when necessary, like when a tween rewinds fully. If the quantity of numbers differs between the start and end, it will always prioritize the end value(s). The pt parameter is optional - it's for a PropTween that will be appended to the end of the linked list and is typically for actually setting the value after all of the elements have been updated (with array.join("")).
			_blobDif = function(start, end, filter, pt) {
				var a = [],
					charIndex = 0,
					s = "",
					color = 0,
					startNums, endNums, num, i, l, nonNumbers, currentNum;
				a.start = start;
				a.end = end;
				start = a[0] = start + ""; //ensure values are strings
				end = a[1] = end + "";
				if (filter) {
					filter(a); //pass an array with the starting and ending values and let the filter do whatever it needs to the values.
					start = a[0];
					end = a[1];
				}
				a.length = 0;
				startNums = start.match(_numbersExp) || [];
				endNums = end.match(_numbersExp) || [];
				if (pt) {
					pt._next = null;
					pt.blob = 1;
					a._firstPT = a._applyPT = pt; //apply last in the linked list (which means inserting it first)
				}
				l = endNums.length;
				for (i = 0; i < l; i++) {
					currentNum = endNums[i];
					nonNumbers = end.substr(charIndex, end.indexOf(currentNum, charIndex)-charIndex);
					s += (nonNumbers || !i) ? nonNumbers : ","; //note: SVG spec allows omission of comma/space when a negative sign is wedged between two numbers, like 2.5-5.3 instead of 2.5,-5.3 but when tweening, the negative value may switch to positive, so we insert the comma just in case.
					charIndex += nonNumbers.length;
					if (color) { //sense rgba() values and round them.
						color = (color + 1) % 5;
					} else if (nonNumbers.substr(-5) === "rgba(") {
						color = 1;
					}
					if (currentNum === startNums[i] || startNums.length <= i) {
						s += currentNum;
					} else {
						if (s) {
							a.push(s);
							s = "";
						}
						num = parseFloat(startNums[i]);
						a.push(num);
						a._firstPT = {_next: a._firstPT, t:a, p: a.length-1, s:num, c:((currentNum.charAt(1) === "=") ? parseInt(currentNum.charAt(0) + "1", 10) * parseFloat(currentNum.substr(2)) : (parseFloat(currentNum) - num)) || 0, f:0, m:(color && color < 4) ? Math.round : 0};
						//note: we don't set _prev because we'll never need to remove individual PropTweens from this list.
					}
					charIndex += currentNum.length;
				}
				s += end.substr(charIndex);
				if (s) {
					a.push(s);
				}
				a.setRatio = _setRatio;
				return a;
			},
			//note: "funcParam" is only necessary for function-based getters/setters that require an extra parameter like getAttribute("width") and setAttribute("width", value). In this example, funcParam would be "width". Used by AttrPlugin for example.
			_addPropTween = function(target, prop, start, end, overwriteProp, mod, funcParam, stringFilter, index) {
				if (typeof(end) === "function") {
					end = end(index || 0, target);
				}
				var type = typeof(target[prop]),
					getterName = (type !== "function") ? "" : ((prop.indexOf("set") || typeof(target["get" + prop.substr(3)]) !== "function") ? prop : "get" + prop.substr(3)),
					s = (start !== "get") ? start : !getterName ? target[prop] : funcParam ? target[getterName](funcParam) : target[getterName](),
					isRelative = (typeof(end) === "string" && end.charAt(1) === "="),
					pt = {t:target, p:prop, s:s, f:(type === "function"), pg:0, n:overwriteProp || prop, m:(!mod ? 0 : (typeof(mod) === "function") ? mod : Math.round), pr:0, c:isRelative ? parseInt(end.charAt(0) + "1", 10) * parseFloat(end.substr(2)) : (parseFloat(end) - s) || 0},
					blob;

				if (typeof(s) !== "number" || (typeof(end) !== "number" && !isRelative)) {
					if (funcParam || isNaN(s) || (!isRelative && isNaN(end)) || typeof(s) === "boolean" || typeof(end) === "boolean") {
						//a blob (string that has multiple numbers in it)
						pt.fp = funcParam;
						blob = _blobDif(s, (isRelative ? pt.s + pt.c : end), stringFilter || TweenLite.defaultStringFilter, pt);
						pt = {t: blob, p: "setRatio", s: 0, c: 1, f: 2, pg: 0, n: overwriteProp || prop, pr: 0, m: 0}; //"2" indicates it's a Blob property tween. Needed for RoundPropsPlugin for example.
					} else {
						pt.s = parseFloat(s);
						if (!isRelative) {
							pt.c = (parseFloat(end) - pt.s) || 0;
						}
					}
				}
				if (pt.c) { //only add it to the linked list if there's a change.
					if ((pt._next = this._firstPT)) {
						pt._next._prev = pt;
					}
					this._firstPT = pt;
					return pt;
				}
			},
			_internals = TweenLite._internals = {isArray:_isArray, isSelector:_isSelector, lazyTweens:_lazyTweens, blobDif:_blobDif}, //gives us a way to expose certain private values to other GreenSock classes without contaminating tha main TweenLite object.
			_plugins = TweenLite._plugins = {},
			_tweenLookup = _internals.tweenLookup = {},
			_tweenLookupNum = 0,
			_reservedProps = _internals.reservedProps = {ease:1, delay:1, overwrite:1, onComplete:1, onCompleteParams:1, onCompleteScope:1, useFrames:1, runBackwards:1, startAt:1, onUpdate:1, onUpdateParams:1, onUpdateScope:1, onStart:1, onStartParams:1, onStartScope:1, onReverseComplete:1, onReverseCompleteParams:1, onReverseCompleteScope:1, onRepeat:1, onRepeatParams:1, onRepeatScope:1, easeParams:1, yoyo:1, immediateRender:1, repeat:1, repeatDelay:1, data:1, paused:1, reversed:1, autoCSS:1, lazy:1, onOverwrite:1, callbackScope:1, stringFilter:1, id:1},
			_overwriteLookup = {none:0, all:1, auto:2, concurrent:3, allOnStart:4, preexisting:5, "true":1, "false":0},
			_rootFramesTimeline = Animation._rootFramesTimeline = new SimpleTimeline(),
			_rootTimeline = Animation._rootTimeline = new SimpleTimeline(),
			_nextGCFrame = 30,
			_lazyRender = _internals.lazyRender = function() {
				var i = _lazyTweens.length,
					tween;
				_lazyLookup = {};
				while (--i > -1) {
					tween = _lazyTweens[i];
					if (tween && tween._lazy !== false) {
						tween.render(tween._lazy[0], tween._lazy[1], true);
						tween._lazy = false;
					}
				}
				_lazyTweens.length = 0;
			};

		_rootTimeline._startTime = _ticker.time;
		_rootFramesTimeline._startTime = _ticker.frame;
		_rootTimeline._active = _rootFramesTimeline._active = true;
		setTimeout(_lazyRender, 1); //on some mobile devices, there isn't a "tick" before code runs which means any lazy renders wouldn't run before the next official "tick".

		Animation._updateRoot = TweenLite.render = function() {
				var i, a, p;
				if (_lazyTweens.length) { //if code is run outside of the requestAnimationFrame loop, there may be tweens queued AFTER the engine refreshed, so we need to ensure any pending renders occur before we refresh again.
					_lazyRender();
				}
				_rootTimeline.render((_ticker.time - _rootTimeline._startTime) * _rootTimeline._timeScale, false, false);
				_rootFramesTimeline.render((_ticker.frame - _rootFramesTimeline._startTime) * _rootFramesTimeline._timeScale, false, false);
				if (_lazyTweens.length) {
					_lazyRender();
				}
				if (_ticker.frame >= _nextGCFrame) { //dump garbage every 120 frames or whatever the user sets TweenLite.autoSleep to
					_nextGCFrame = _ticker.frame + (parseInt(TweenLite.autoSleep, 10) || 120);
					for (p in _tweenLookup) {
						a = _tweenLookup[p].tweens;
						i = a.length;
						while (--i > -1) {
							if (a[i]._gc) {
								a.splice(i, 1);
							}
						}
						if (a.length === 0) {
							delete _tweenLookup[p];
						}
					}
					//if there are no more tweens in the root timelines, or if they're all paused, make the _timer sleep to reduce load on the CPU slightly
					p = _rootTimeline._first;
					if (!p || p._paused) if (TweenLite.autoSleep && !_rootFramesTimeline._first && _ticker._listeners.tick.length === 1) {
						while (p && p._paused) {
							p = p._next;
						}
						if (!p) {
							_ticker.sleep();
						}
					}
				}
			};

		_ticker.addEventListener("tick", Animation._updateRoot);

		var _register = function(target, tween, scrub) {
				var id = target._gsTweenID, a, i;
				if (!_tweenLookup[id || (target._gsTweenID = id = "t" + (_tweenLookupNum++))]) {
					_tweenLookup[id] = {target:target, tweens:[]};
				}
				if (tween) {
					a = _tweenLookup[id].tweens;
					a[(i = a.length)] = tween;
					if (scrub) {
						while (--i > -1) {
							if (a[i] === tween) {
								a.splice(i, 1);
							}
						}
					}
				}
				return _tweenLookup[id].tweens;
			},
			_onOverwrite = function(overwrittenTween, overwritingTween, target, killedProps) {
				var func = overwrittenTween.vars.onOverwrite, r1, r2;
				if (func) {
					r1 = func(overwrittenTween, overwritingTween, target, killedProps);
				}
				func = TweenLite.onOverwrite;
				if (func) {
					r2 = func(overwrittenTween, overwritingTween, target, killedProps);
				}
				return (r1 !== false && r2 !== false);
			},
			_applyOverwrite = function(target, tween, props, mode, siblings) {
				var i, changed, curTween, l;
				if (mode === 1 || mode >= 4) {
					l = siblings.length;
					for (i = 0; i < l; i++) {
						if ((curTween = siblings[i]) !== tween) {
							if (!curTween._gc) {
								if (curTween._kill(null, target, tween)) {
									changed = true;
								}
							}
						} else if (mode === 5) {
							break;
						}
					}
					return changed;
				}
				//NOTE: Add 0.0000000001 to overcome floating point errors that can cause the startTime to be VERY slightly off (when a tween's time() is set for example)
				var startTime = tween._startTime + _tinyNum,
					overlaps = [],
					oCount = 0,
					zeroDur = (tween._duration === 0),
					globalStart;
				i = siblings.length;
				while (--i > -1) {
					if ((curTween = siblings[i]) === tween || curTween._gc || curTween._paused) {
						//ignore
					} else if (curTween._timeline !== tween._timeline) {
						globalStart = globalStart || _checkOverlap(tween, 0, zeroDur);
						if (_checkOverlap(curTween, globalStart, zeroDur) === 0) {
							overlaps[oCount++] = curTween;
						}
					} else if (curTween._startTime <= startTime) if (curTween._startTime + curTween.totalDuration() / curTween._timeScale > startTime) if (!((zeroDur || !curTween._initted) && startTime - curTween._startTime <= 0.0000000002)) {
						overlaps[oCount++] = curTween;
					}
				}

				i = oCount;
				while (--i > -1) {
					curTween = overlaps[i];
					if (mode === 2) if (curTween._kill(props, target, tween)) {
						changed = true;
					}
					if (mode !== 2 || (!curTween._firstPT && curTween._initted)) {
						if (mode !== 2 && !_onOverwrite(curTween, tween)) {
							continue;
						}
						if (curTween._enabled(false, false)) { //if all property tweens have been overwritten, kill the tween.
							changed = true;
						}
					}
				}
				return changed;
			},
			_checkOverlap = function(tween, reference, zeroDur) {
				var tl = tween._timeline,
					ts = tl._timeScale,
					t = tween._startTime;
				while (tl._timeline) {
					t += tl._startTime;
					ts *= tl._timeScale;
					if (tl._paused) {
						return -100;
					}
					tl = tl._timeline;
				}
				t /= ts;
				return (t > reference) ? t - reference : ((zeroDur && t === reference) || (!tween._initted && t - reference < 2 * _tinyNum)) ? _tinyNum : ((t += tween.totalDuration() / tween._timeScale / ts) > reference + _tinyNum) ? 0 : t - reference - _tinyNum;
			};


//---- TweenLite instance methods -----------------------------------------------------------------------------

		p._init = function() {
			var v = this.vars,
				op = this._overwrittenProps,
				dur = this._duration,
				immediate = !!v.immediateRender,
				ease = v.ease,
				i, initPlugins, pt, p, startVars, l;
			if (v.startAt) {
				if (this._startAt) {
					this._startAt.render(-1, true); //if we've run a startAt previously (when the tween instantiated), we should revert it so that the values re-instantiate correctly particularly for relative tweens. Without this, a TweenLite.fromTo(obj, 1, {x:"+=100"}, {x:"-=100"}), for example, would actually jump to +=200 because the startAt would run twice, doubling the relative change.
					this._startAt.kill();
				}
				startVars = {};
				for (p in v.startAt) { //copy the properties/values into a new object to avoid collisions, like var to = {x:0}, from = {x:500}; timeline.fromTo(e, 1, from, to).fromTo(e, 1, to, from);
					startVars[p] = v.startAt[p];
				}
				startVars.overwrite = false;
				startVars.immediateRender = true;
				startVars.lazy = (immediate && v.lazy !== false);
				startVars.startAt = startVars.delay = null; //no nesting of startAt objects allowed (otherwise it could cause an infinite loop).
				this._startAt = TweenLite.to(this.target, 0, startVars);
				if (immediate) {
					if (this._time > 0) {
						this._startAt = null; //tweens that render immediately (like most from() and fromTo() tweens) shouldn't revert when their parent timeline's playhead goes backward past the startTime because the initial render could have happened anytime and it shouldn't be directly correlated to this tween's startTime. Imagine setting up a complex animation where the beginning states of various objects are rendered immediately but the tween doesn't happen for quite some time - if we revert to the starting values as soon as the playhead goes backward past the tween's startTime, it will throw things off visually. Reversion should only happen in TimelineLite/Max instances where immediateRender was false (which is the default in the convenience methods like from()).
					} else if (dur !== 0) {
						return; //we skip initialization here so that overwriting doesn't occur until the tween actually begins. Otherwise, if you create several immediateRender:true tweens of the same target/properties to drop into a TimelineLite or TimelineMax, the last one created would overwrite the first ones because they didn't get placed into the timeline yet before the first render occurs and kicks in overwriting.
					}
				}
			} else if (v.runBackwards && dur !== 0) {
				//from() tweens must be handled uniquely: their beginning values must be rendered but we don't want overwriting to occur yet (when time is still 0). Wait until the tween actually begins before doing all the routines like overwriting. At that time, we should render at the END of the tween to ensure that things initialize correctly (remember, from() tweens go backwards)
				if (this._startAt) {
					this._startAt.render(-1, true);
					this._startAt.kill();
					this._startAt = null;
				} else {
					if (this._time !== 0) { //in rare cases (like if a from() tween runs and then is invalidate()-ed), immediateRender could be true but the initial forced-render gets skipped, so there's no need to force the render in this context when the _time is greater than 0
						immediate = false;
					}
					pt = {};
					for (p in v) { //copy props into a new object and skip any reserved props, otherwise onComplete or onUpdate or onStart could fire. We should, however, permit autoCSS to go through.
						if (!_reservedProps[p] || p === "autoCSS") {
							pt[p] = v[p];
						}
					}
					pt.overwrite = 0;
					pt.data = "isFromStart"; //we tag the tween with as "isFromStart" so that if [inside a plugin] we need to only do something at the very END of a tween, we have a way of identifying this tween as merely the one that's setting the beginning values for a "from()" tween. For example, clearProps in CSSPlugin should only get applied at the very END of a tween and without this tag, from(...{height:100, clearProps:"height", delay:1}) would wipe the height at the beginning of the tween and after 1 second, it'd kick back in.
					pt.lazy = (immediate && v.lazy !== false);
					pt.immediateRender = immediate; //zero-duration tweens render immediately by default, but if we're not specifically instructed to render this tween immediately, we should skip this and merely _init() to record the starting values (rendering them immediately would push them to completion which is wasteful in that case - we'd have to render(-1) immediately after)
					this._startAt = TweenLite.to(this.target, 0, pt);
					if (!immediate) {
						this._startAt._init(); //ensures that the initial values are recorded
						this._startAt._enabled(false); //no need to have the tween render on the next cycle. Disable it because we'll always manually control the renders of the _startAt tween.
						if (this.vars.immediateRender) {
							this._startAt = null;
						}
					} else if (this._time === 0) {
						return;
					}
				}
			}
			this._ease = ease = (!ease) ? TweenLite.defaultEase : (ease instanceof Ease) ? ease : (typeof(ease) === "function") ? new Ease(ease, v.easeParams) : _easeMap[ease] || TweenLite.defaultEase;
			if (v.easeParams instanceof Array && ease.config) {
				this._ease = ease.config.apply(ease, v.easeParams);
			}
			this._easeType = this._ease._type;
			this._easePower = this._ease._power;
			this._firstPT = null;

			if (this._targets) {
				l = this._targets.length;
				for (i = 0; i < l; i++) {
					if ( this._initProps( this._targets[i], (this._propLookup[i] = {}), this._siblings[i], (op ? op[i] : null), i) ) {
						initPlugins = true;
					}
				}
			} else {
				initPlugins = this._initProps(this.target, this._propLookup, this._siblings, op, 0);
			}

			if (initPlugins) {
				TweenLite._onPluginEvent("_onInitAllProps", this); //reorders the array in order of priority. Uses a static TweenPlugin method in order to minimize file size in TweenLite
			}
			if (op) if (!this._firstPT) if (typeof(this.target) !== "function") { //if all tweening properties have been overwritten, kill the tween. If the target is a function, it's probably a delayedCall so let it live.
				this._enabled(false, false);
			}
			if (v.runBackwards) {
				pt = this._firstPT;
				while (pt) {
					pt.s += pt.c;
					pt.c = -pt.c;
					pt = pt._next;
				}
			}
			this._onUpdate = v.onUpdate;
			this._initted = true;
		};

		p._initProps = function(target, propLookup, siblings, overwrittenProps, index) {
			var p, i, initPlugins, plugin, pt, v;
			if (target == null) {
				return false;
			}

			if (_lazyLookup[target._gsTweenID]) {
				_lazyRender(); //if other tweens of the same target have recently initted but haven't rendered yet, we've got to force the render so that the starting values are correct (imagine populating a timeline with a bunch of sequential tweens and then jumping to the end)
			}

			if (!this.vars.css) if (target.style) if (target !== window && target.nodeType) if (_plugins.css) if (this.vars.autoCSS !== false) { //it's so common to use TweenLite/Max to animate the css of DOM elements, we assume that if the target is a DOM element, that's what is intended (a convenience so that users don't have to wrap things in css:{}, although we still recommend it for a slight performance boost and better specificity). Note: we cannot check "nodeType" on the window inside an iframe.
				_autoCSS(this.vars, target);
			}
			for (p in this.vars) {
				v = this.vars[p];
				if (_reservedProps[p]) {
					if (v) if ((v instanceof Array) || (v.push && _isArray(v))) if (v.join("").indexOf("{self}") !== -1) {
						this.vars[p] = v = this._swapSelfInParams(v, this);
					}

				} else if (_plugins[p] && (plugin = new _plugins[p]())._onInitTween(target, this.vars[p], this, index)) {

					//t - target 		[object]
					//p - property 		[string]
					//s - start			[number]
					//c - change		[number]
					//f - isFunction	[boolean]
					//n - name			[string]
					//pg - isPlugin 	[boolean]
					//pr - priority		[number]
					//m - mod           [function | 0]
					this._firstPT = pt = {_next:this._firstPT, t:plugin, p:"setRatio", s:0, c:1, f:1, n:p, pg:1, pr:plugin._priority, m:0};
					i = plugin._overwriteProps.length;
					while (--i > -1) {
						propLookup[plugin._overwriteProps[i]] = this._firstPT;
					}
					if (plugin._priority || plugin._onInitAllProps) {
						initPlugins = true;
					}
					if (plugin._onDisable || plugin._onEnable) {
						this._notifyPluginsOfEnabled = true;
					}
					if (pt._next) {
						pt._next._prev = pt;
					}

				} else {
					propLookup[p] = _addPropTween.call(this, target, p, "get", v, p, 0, null, this.vars.stringFilter, index);
				}
			}

			if (overwrittenProps) if (this._kill(overwrittenProps, target)) { //another tween may have tried to overwrite properties of this tween before init() was called (like if two tweens start at the same time, the one created second will run first)
				return this._initProps(target, propLookup, siblings, overwrittenProps, index);
			}
			if (this._overwrite > 1) if (this._firstPT) if (siblings.length > 1) if (_applyOverwrite(target, this, propLookup, this._overwrite, siblings)) {
				this._kill(propLookup, target);
				return this._initProps(target, propLookup, siblings, overwrittenProps, index);
			}
			if (this._firstPT) if ((this.vars.lazy !== false && this._duration) || (this.vars.lazy && !this._duration)) { //zero duration tweens don't lazy render by default; everything else does.
				_lazyLookup[target._gsTweenID] = true;
			}
			return initPlugins;
		};

		p.render = function(time, suppressEvents, force) {
			var prevTime = this._time,
				duration = this._duration,
				prevRawPrevTime = this._rawPrevTime,
				isComplete, callback, pt, rawPrevTime;
			if (time >= duration - 0.0000001 && time >= 0) { //to work around occasional floating point math artifacts.
				this._totalTime = this._time = duration;
				this.ratio = this._ease._calcEnd ? this._ease.getRatio(1) : 1;
				if (!this._reversed ) {
					isComplete = true;
					callback = "onComplete";
					force = (force || this._timeline.autoRemoveChildren); //otherwise, if the animation is unpaused/activated after it's already finished, it doesn't get removed from the parent timeline.
				}
				if (duration === 0) if (this._initted || !this.vars.lazy || force) { //zero-duration tweens are tricky because we must discern the momentum/direction of time in order to determine whether the starting values should be rendered or the ending values. If the "playhead" of its timeline goes past the zero-duration tween in the forward direction or lands directly on it, the end values should be rendered, but if the timeline's "playhead" moves past it in the backward direction (from a postitive time to a negative time), the starting values must be rendered.
					if (this._startTime === this._timeline._duration) { //if a zero-duration tween is at the VERY end of a timeline and that timeline renders at its end, it will typically add a tiny bit of cushion to the render time to prevent rounding errors from getting in the way of tweens rendering their VERY end. If we then reverse() that timeline, the zero-duration tween will trigger its onReverseComplete even though technically the playhead didn't pass over it again. It's a very specific edge case we must accommodate.
						time = 0;
					}
					if (prevRawPrevTime < 0 || (time <= 0 && time >= -0.0000001) || (prevRawPrevTime === _tinyNum && this.data !== "isPause")) if (prevRawPrevTime !== time) { //note: when this.data is "isPause", it's a callback added by addPause() on a timeline that we should not be triggered when LEAVING its exact start time. In other words, tl.addPause(1).play(1) shouldn't pause.
						force = true;
						if (prevRawPrevTime > _tinyNum) {
							callback = "onReverseComplete";
						}
					}
					this._rawPrevTime = rawPrevTime = (!suppressEvents || time || prevRawPrevTime === time) ? time : _tinyNum; //when the playhead arrives at EXACTLY time 0 (right on top) of a zero-duration tween, we need to discern if events are suppressed so that when the playhead moves again (next time), it'll trigger the callback. If events are NOT suppressed, obviously the callback would be triggered in this render. Basically, the callback should fire either when the playhead ARRIVES or LEAVES this exact spot, not both. Imagine doing a timeline.seek(0) and there's a callback that sits at 0. Since events are suppressed on that seek() by default, nothing will fire, but when the playhead moves off of that position, the callback should fire. This behavior is what people intuitively expect. We set the _rawPrevTime to be a precise tiny number to indicate this scenario rather than using another property/variable which would increase memory usage. This technique is less readable, but more efficient.
				}

			} else if (time < 0.0000001) { //to work around occasional floating point math artifacts, round super small values to 0.
				this._totalTime = this._time = 0;
				this.ratio = this._ease._calcEnd ? this._ease.getRatio(0) : 0;
				if (prevTime !== 0 || (duration === 0 && prevRawPrevTime > 0)) {
					callback = "onReverseComplete";
					isComplete = this._reversed;
				}
				if (time < 0) {
					this._active = false;
					if (duration === 0) if (this._initted || !this.vars.lazy || force) { //zero-duration tweens are tricky because we must discern the momentum/direction of time in order to determine whether the starting values should be rendered or the ending values. If the "playhead" of its timeline goes past the zero-duration tween in the forward direction or lands directly on it, the end values should be rendered, but if the timeline's "playhead" moves past it in the backward direction (from a postitive time to a negative time), the starting values must be rendered.
						if (prevRawPrevTime >= 0 && !(prevRawPrevTime === _tinyNum && this.data === "isPause")) {
							force = true;
						}
						this._rawPrevTime = rawPrevTime = (!suppressEvents || time || prevRawPrevTime === time) ? time : _tinyNum; //when the playhead arrives at EXACTLY time 0 (right on top) of a zero-duration tween, we need to discern if events are suppressed so that when the playhead moves again (next time), it'll trigger the callback. If events are NOT suppressed, obviously the callback would be triggered in this render. Basically, the callback should fire either when the playhead ARRIVES or LEAVES this exact spot, not both. Imagine doing a timeline.seek(0) and there's a callback that sits at 0. Since events are suppressed on that seek() by default, nothing will fire, but when the playhead moves off of that position, the callback should fire. This behavior is what people intuitively expect. We set the _rawPrevTime to be a precise tiny number to indicate this scenario rather than using another property/variable which would increase memory usage. This technique is less readable, but more efficient.
					}
				}
				if (!this._initted) { //if we render the very beginning (time == 0) of a fromTo(), we must force the render (normal tweens wouldn't need to render at a time of 0 when the prevTime was also 0). This is also mandatory to make sure overwriting kicks in immediately.
					force = true;
				}
			} else {
				this._totalTime = this._time = time;

				if (this._easeType) {
					var r = time / duration, type = this._easeType, pow = this._easePower;
					if (type === 1 || (type === 3 && r >= 0.5)) {
						r = 1 - r;
					}
					if (type === 3) {
						r *= 2;
					}
					if (pow === 1) {
						r *= r;
					} else if (pow === 2) {
						r *= r * r;
					} else if (pow === 3) {
						r *= r * r * r;
					} else if (pow === 4) {
						r *= r * r * r * r;
					}

					if (type === 1) {
						this.ratio = 1 - r;
					} else if (type === 2) {
						this.ratio = r;
					} else if (time / duration < 0.5) {
						this.ratio = r / 2;
					} else {
						this.ratio = 1 - (r / 2);
					}

				} else {
					this.ratio = this._ease.getRatio(time / duration);
				}
			}

			if (this._time === prevTime && !force) {
				return;
			} else if (!this._initted) {
				this._init();
				if (!this._initted || this._gc) { //immediateRender tweens typically won't initialize until the playhead advances (_time is greater than 0) in order to ensure that overwriting occurs properly. Also, if all of the tweening properties have been overwritten (which would cause _gc to be true, as set in _init()), we shouldn't continue otherwise an onStart callback could be called for example.
					return;
				} else if (!force && this._firstPT && ((this.vars.lazy !== false && this._duration) || (this.vars.lazy && !this._duration))) {
					this._time = this._totalTime = prevTime;
					this._rawPrevTime = prevRawPrevTime;
					_lazyTweens.push(this);
					this._lazy = [time, suppressEvents];
					return;
				}
				//_ease is initially set to defaultEase, so now that init() has run, _ease is set properly and we need to recalculate the ratio. Overall this is faster than using conditional logic earlier in the method to avoid having to set ratio twice because we only init() once but renderTime() gets called VERY frequently.
				if (this._time && !isComplete) {
					this.ratio = this._ease.getRatio(this._time / duration);
				} else if (isComplete && this._ease._calcEnd) {
					this.ratio = this._ease.getRatio((this._time === 0) ? 0 : 1);
				}
			}
			if (this._lazy !== false) { //in case a lazy render is pending, we should flush it because the new render is occurring now (imagine a lazy tween instantiating and then immediately the user calls tween.seek(tween.duration()), skipping to the end - the end render would be forced, and then if we didn't flush the lazy render, it'd fire AFTER the seek(), rendering it at the wrong time.
				this._lazy = false;
			}
			if (!this._active) if (!this._paused && this._time !== prevTime && time >= 0) {
				this._active = true;  //so that if the user renders a tween (as opposed to the timeline rendering it), the timeline is forced to re-render and align it with the proper time/frame on the next rendering cycle. Maybe the tween already finished but the user manually re-renders it as halfway done.
			}
			if (prevTime === 0) {
				if (this._startAt) {
					if (time >= 0) {
						this._startAt.render(time, suppressEvents, force);
					} else if (!callback) {
						callback = "_dummyGS"; //if no callback is defined, use a dummy value just so that the condition at the end evaluates as true because _startAt should render AFTER the normal render loop when the time is negative. We could handle this in a more intuitive way, of course, but the render loop is the MOST important thing to optimize, so this technique allows us to avoid adding extra conditional logic in a high-frequency area.
					}
				}
				if (this.vars.onStart) if (this._time !== 0 || duration === 0) if (!suppressEvents) {
					this._callback("onStart");
				}
			}
			pt = this._firstPT;
			while (pt) {
				if (pt.f) {
					pt.t[pt.p](pt.c * this.ratio + pt.s);
				} else {
					pt.t[pt.p] = pt.c * this.ratio + pt.s;
				}
				pt = pt._next;
			}

			if (this._onUpdate) {
				if (time < 0) if (this._startAt && time !== -0.0001) { //if the tween is positioned at the VERY beginning (_startTime 0) of its parent timeline, it's illegal for the playhead to go back further, so we should not render the recorded startAt values.
					this._startAt.render(time, suppressEvents, force); //note: for performance reasons, we tuck this conditional logic inside less traveled areas (most tweens don't have an onUpdate). We'd just have it at the end before the onComplete, but the values should be updated before any onUpdate is called, so we ALSO put it here and then if it's not called, we do so later near the onComplete.
				}
				if (!suppressEvents) if (this._time !== prevTime || isComplete || force) {
					this._callback("onUpdate");
				}
			}
			if (callback) if (!this._gc || force) { //check _gc because there's a chance that kill() could be called in an onUpdate
				if (time < 0 && this._startAt && !this._onUpdate && time !== -0.0001) { //-0.0001 is a special value that we use when looping back to the beginning of a repeated TimelineMax, in which case we shouldn't render the _startAt values.
					this._startAt.render(time, suppressEvents, force);
				}
				if (isComplete) {
					if (this._timeline.autoRemoveChildren) {
						this._enabled(false, false);
					}
					this._active = false;
				}
				if (!suppressEvents && this.vars[callback]) {
					this._callback(callback);
				}
				if (duration === 0 && this._rawPrevTime === _tinyNum && rawPrevTime !== _tinyNum) { //the onComplete or onReverseComplete could trigger movement of the playhead and for zero-duration tweens (which must discern direction) that land directly back on their start time, we don't want to fire again on the next render. Think of several addPause()'s in a timeline that forces the playhead to a certain spot, but what if it's already paused and another tween is tweening the "time" of the timeline? Each time it moves [forward] past that spot, it would move back, and since suppressEvents is true, it'd reset _rawPrevTime to _tinyNum so that when it begins again, the callback would fire (so ultimately it could bounce back and forth during that tween). Again, this is a very uncommon scenario, but possible nonetheless.
					this._rawPrevTime = 0;
				}
			}
		};

		p._kill = function(vars, target, overwritingTween) {
			if (vars === "all") {
				vars = null;
			}
			if (vars == null) if (target == null || target === this.target) {
				this._lazy = false;
				return this._enabled(false, false);
			}
			target = (typeof(target) !== "string") ? (target || this._targets || this.target) : TweenLite.selector(target) || target;
			var simultaneousOverwrite = (overwritingTween && this._time && overwritingTween._startTime === this._startTime && this._timeline === overwritingTween._timeline),
				i, overwrittenProps, p, pt, propLookup, changed, killProps, record, killed;
			if ((_isArray(target) || _isSelector(target)) && typeof(target[0]) !== "number") {
				i = target.length;
				while (--i > -1) {
					if (this._kill(vars, target[i], overwritingTween)) {
						changed = true;
					}
				}
			} else {
				if (this._targets) {
					i = this._targets.length;
					while (--i > -1) {
						if (target === this._targets[i]) {
							propLookup = this._propLookup[i] || {};
							this._overwrittenProps = this._overwrittenProps || [];
							overwrittenProps = this._overwrittenProps[i] = vars ? this._overwrittenProps[i] || {} : "all";
							break;
						}
					}
				} else if (target !== this.target) {
					return false;
				} else {
					propLookup = this._propLookup;
					overwrittenProps = this._overwrittenProps = vars ? this._overwrittenProps || {} : "all";
				}

				if (propLookup) {
					killProps = vars || propLookup;
					record = (vars !== overwrittenProps && overwrittenProps !== "all" && vars !== propLookup && (typeof(vars) !== "object" || !vars._tempKill)); //_tempKill is a super-secret way to delete a particular tweening property but NOT have it remembered as an official overwritten property (like in BezierPlugin)
					if (overwritingTween && (TweenLite.onOverwrite || this.vars.onOverwrite)) {
						for (p in killProps) {
							if (propLookup[p]) {
								if (!killed) {
									killed = [];
								}
								killed.push(p);
							}
						}
						if ((killed || !vars) && !_onOverwrite(this, overwritingTween, target, killed)) { //if the onOverwrite returned false, that means the user wants to override the overwriting (cancel it).
							return false;
						}
					}

					for (p in killProps) {
						if ((pt = propLookup[p])) {
							if (simultaneousOverwrite) { //if another tween overwrites this one and they both start at exactly the same time, yet this tween has already rendered once (for example, at 0.001) because it's first in the queue, we should revert the values to where they were at 0 so that the starting values aren't contaminated on the overwriting tween.
								if (pt.f) {
									pt.t[pt.p](pt.s);
								} else {
									pt.t[pt.p] = pt.s;
								}
								changed = true;
							}
							if (pt.pg && pt.t._kill(killProps)) {
								changed = true; //some plugins need to be notified so they can perform cleanup tasks first
							}
							if (!pt.pg || pt.t._overwriteProps.length === 0) {
								if (pt._prev) {
									pt._prev._next = pt._next;
								} else if (pt === this._firstPT) {
									this._firstPT = pt._next;
								}
								if (pt._next) {
									pt._next._prev = pt._prev;
								}
								pt._next = pt._prev = null;
							}
							delete propLookup[p];
						}
						if (record) {
							overwrittenProps[p] = 1;
						}
					}
					if (!this._firstPT && this._initted) { //if all tweening properties are killed, kill the tween. Without this line, if there's a tween with multiple targets and then you killTweensOf() each target individually, the tween would technically still remain active and fire its onComplete even though there aren't any more properties tweening.
						this._enabled(false, false);
					}
				}
			}
			return changed;
		};

		p.invalidate = function() {
			if (this._notifyPluginsOfEnabled) {
				TweenLite._onPluginEvent("_onDisable", this);
			}
			this._firstPT = this._overwrittenProps = this._startAt = this._onUpdate = null;
			this._notifyPluginsOfEnabled = this._active = this._lazy = false;
			this._propLookup = (this._targets) ? {} : [];
			Animation.prototype.invalidate.call(this);
			if (this.vars.immediateRender) {
				this._time = -_tinyNum; //forces a render without having to set the render() "force" parameter to true because we want to allow lazying by default (using the "force" parameter always forces an immediate full render)
				this.render(Math.min(0, -this._delay)); //in case delay is negative.
			}
			return this;
		};

		p._enabled = function(enabled, ignoreTimeline) {
			if (!_tickerActive) {
				_ticker.wake();
			}
			if (enabled && this._gc) {
				var targets = this._targets,
					i;
				if (targets) {
					i = targets.length;
					while (--i > -1) {
						this._siblings[i] = _register(targets[i], this, true);
					}
				} else {
					this._siblings = _register(this.target, this, true);
				}
			}
			Animation.prototype._enabled.call(this, enabled, ignoreTimeline);
			if (this._notifyPluginsOfEnabled) if (this._firstPT) {
				return TweenLite._onPluginEvent((enabled ? "_onEnable" : "_onDisable"), this);
			}
			return false;
		};


//----TweenLite static methods -----------------------------------------------------

		TweenLite.to = function(target, duration, vars) {
			return new TweenLite(target, duration, vars);
		};

		TweenLite.from = function(target, duration, vars) {
			vars.runBackwards = true;
			vars.immediateRender = (vars.immediateRender != false);
			return new TweenLite(target, duration, vars);
		};

		TweenLite.fromTo = function(target, duration, fromVars, toVars) {
			toVars.startAt = fromVars;
			toVars.immediateRender = (toVars.immediateRender != false && fromVars.immediateRender != false);
			return new TweenLite(target, duration, toVars);
		};

		TweenLite.delayedCall = function(delay, callback, params, scope, useFrames) {
			return new TweenLite(callback, 0, {delay:delay, onComplete:callback, onCompleteParams:params, callbackScope:scope, onReverseComplete:callback, onReverseCompleteParams:params, immediateRender:false, lazy:false, useFrames:useFrames, overwrite:0});
		};

		TweenLite.set = function(target, vars) {
			return new TweenLite(target, 0, vars);
		};

		TweenLite.getTweensOf = function(target, onlyActive) {
			if (target == null) { return []; }
			target = (typeof(target) !== "string") ? target : TweenLite.selector(target) || target;
			var i, a, j, t;
			if ((_isArray(target) || _isSelector(target)) && typeof(target[0]) !== "number") {
				i = target.length;
				a = [];
				while (--i > -1) {
					a = a.concat(TweenLite.getTweensOf(target[i], onlyActive));
				}
				i = a.length;
				//now get rid of any duplicates (tweens of arrays of objects could cause duplicates)
				while (--i > -1) {
					t = a[i];
					j = i;
					while (--j > -1) {
						if (t === a[j]) {
							a.splice(i, 1);
						}
					}
				}
			} else {
				a = _register(target).concat();
				i = a.length;
				while (--i > -1) {
					if (a[i]._gc || (onlyActive && !a[i].isActive())) {
						a.splice(i, 1);
					}
				}
			}
			return a;
		};

		TweenLite.killTweensOf = TweenLite.killDelayedCallsTo = function(target, onlyActive, vars) {
			if (typeof(onlyActive) === "object") {
				vars = onlyActive; //for backwards compatibility (before "onlyActive" parameter was inserted)
				onlyActive = false;
			}
			var a = TweenLite.getTweensOf(target, onlyActive),
				i = a.length;
			while (--i > -1) {
				a[i]._kill(vars, target);
			}
		};



/*
 * ----------------------------------------------------------------
 * TweenPlugin   (could easily be split out as a separate file/class, but included for ease of use (so that people don't need to include another script call before loading plugins which is easy to forget)
 * ----------------------------------------------------------------
 */
		var TweenPlugin = _class("plugins.TweenPlugin", function(props, priority) {
					this._overwriteProps = (props || "").split(",");
					this._propName = this._overwriteProps[0];
					this._priority = priority || 0;
					this._super = TweenPlugin.prototype;
				}, true);

		p = TweenPlugin.prototype;
		TweenPlugin.version = "1.19.0";
		TweenPlugin.API = 2;
		p._firstPT = null;
		p._addTween = _addPropTween;
		p.setRatio = _setRatio;

		p._kill = function(lookup) {
			var a = this._overwriteProps,
				pt = this._firstPT,
				i;
			if (lookup[this._propName] != null) {
				this._overwriteProps = [];
			} else {
				i = a.length;
				while (--i > -1) {
					if (lookup[a[i]] != null) {
						a.splice(i, 1);
					}
				}
			}
			while (pt) {
				if (lookup[pt.n] != null) {
					if (pt._next) {
						pt._next._prev = pt._prev;
					}
					if (pt._prev) {
						pt._prev._next = pt._next;
						pt._prev = null;
					} else if (this._firstPT === pt) {
						this._firstPT = pt._next;
					}
				}
				pt = pt._next;
			}
			return false;
		};

		p._mod = p._roundProps = function(lookup) {
			var pt = this._firstPT,
				val;
			while (pt) {
				val = lookup[this._propName] || (pt.n != null && lookup[ pt.n.split(this._propName + "_").join("") ]);
				if (val && typeof(val) === "function") { //some properties that are very plugin-specific add a prefix named after the _propName plus an underscore, so we need to ignore that extra stuff here.
					if (pt.f === 2) {
						pt.t._applyPT.m = val;
					} else {
						pt.m = val;
					}
				}
				pt = pt._next;
			}
		};

		TweenLite._onPluginEvent = function(type, tween) {
			var pt = tween._firstPT,
				changed, pt2, first, last, next;
			if (type === "_onInitAllProps") {
				//sorts the PropTween linked list in order of priority because some plugins need to render earlier/later than others, like MotionBlurPlugin applies its effects after all x/y/alpha tweens have rendered on each frame.
				while (pt) {
					next = pt._next;
					pt2 = first;
					while (pt2 && pt2.pr > pt.pr) {
						pt2 = pt2._next;
					}
					if ((pt._prev = pt2 ? pt2._prev : last)) {
						pt._prev._next = pt;
					} else {
						first = pt;
					}
					if ((pt._next = pt2)) {
						pt2._prev = pt;
					} else {
						last = pt;
					}
					pt = next;
				}
				pt = tween._firstPT = first;
			}
			while (pt) {
				if (pt.pg) if (typeof(pt.t[type]) === "function") if (pt.t[type]()) {
					changed = true;
				}
				pt = pt._next;
			}
			return changed;
		};

		TweenPlugin.activate = function(plugins) {
			var i = plugins.length;
			while (--i > -1) {
				if (plugins[i].API === TweenPlugin.API) {
					_plugins[(new plugins[i]())._propName] = plugins[i];
				}
			}
			return true;
		};

		//provides a more concise way to define plugins that have no dependencies besides TweenPlugin and TweenLite, wrapping common boilerplate stuff into one function (added in 1.9.0). You don't NEED to use this to define a plugin - the old way still works and can be useful in certain (rare) situations.
		_gsDefine.plugin = function(config) {
			if (!config || !config.propName || !config.init || !config.API) { throw "illegal plugin definition."; }
			var propName = config.propName,
				priority = config.priority || 0,
				overwriteProps = config.overwriteProps,
				map = {init:"_onInitTween", set:"setRatio", kill:"_kill", round:"_mod", mod:"_mod", initAll:"_onInitAllProps"},
				Plugin = _class("plugins." + propName.charAt(0).toUpperCase() + propName.substr(1) + "Plugin",
					function() {
						TweenPlugin.call(this, propName, priority);
						this._overwriteProps = overwriteProps || [];
					}, (config.global === true)),
				p = Plugin.prototype = new TweenPlugin(propName),
				prop;
			p.constructor = Plugin;
			Plugin.API = config.API;
			for (prop in map) {
				if (typeof(config[prop]) === "function") {
					p[map[prop]] = config[prop];
				}
			}
			Plugin.version = config.version;
			TweenPlugin.activate([Plugin]);
			return Plugin;
		};

		//now run through all the dependencies discovered and if any are missing, log that to the console as a warning. This is why it's best to have TweenLite load last - it can check all the dependencies for you.
		a = window._gsQueue;
		if (a) {
			for (i = 0; i < a.length; i++) {
				a[i]();
			}
			for (p in _defLookup) {
				if (!_defLookup[p].func) {
					window.console.log("GSAP encountered missing dependency: " + p);
				}
			}
		}

		_tickerActive = false; //ensures that the first official animation forces a ticker.tick() to update the time when it is instantiated

})((typeof(module) !== "undefined" && module.exports && typeof(global) !== "undefined") ? global : this || window, "TweenMax");
