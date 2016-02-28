// TODO: This should all really be condensed into a single generalised function
//       when I'm not feeling lazy

var sim = {
    // Internal globals
    i: {
        // Simulator backend root endpoint
        endpoint: "http://api.supramolecular.echus.co/bindsim/api",
        plot_id: "plot", // ID of plot container div
        axis_response: "axis-response",
        forms: "#params-ic50",
        button: "#button-plot",
        control: "#control",
        selector: "#selector",
        $forms: {},
        $button: {}
    },
         
    on_ready: function() {
        /**
         * Initialisation function, called on document ready
         */
        console.log("sim.on_ready called");

        // Initialise internal jQuery objects
        // TODO: is this ok to do, or should the globals just be string selectors?
        sim.i.$forms = $(sim.i.forms); // All available param forms
        sim.i.$button = $(sim.i.button); // Plot button

        // Initialise default simulator plot
        sim[$(sim.i.selector).val()].init();

        // Trigger replot on Enter in any form
        $(sim.i.control+" :input").on("keyup", function(event) {
            //if(event.keyCode == 13) {
                sim.i.$button.click();
            //}
        });
        
        // Handle simulator selector dropdown
        $(sim.i.selector).on("change", sim.handle_selector);
    },

    handle_selector: function() {
        console.log("sim.handle_selector called");
        
        // On selection change, run selected simulator's init function
        // (Dropdown selection value is set to the name of the simulator object)
        selection = $(this).val();
        sim[selection].init();
    },

    sim_call: function(request, endpoint, on_done, on_fail) {
        /**
         * Call sim backend and execute specified callback on completion
         *
         * @param {Object} request - Appropriately structured request object 
         *  for sim backend API
         * @param {callback} on_done - Callback to execute on call success, 
         *  passed backend response and request object
         * @param {callback} on_faile - Callback to execute on call failure, 
         *  passed backend response and request object
         */
        
        var jqxhr = $.ajax({
            url: endpoint,
            type: "POST",
            data: JSON.stringify(request),
            contentType: "application/json; charset=utf-8",
            dataType: "json"
        });

        jqxhr.done(function(data) {
            on_done(data, request);
        });

        jqxhr.fail(function(data) {
            on_fail(data, request);
        });
    },

    params_to_json: function($form, on_fail) {
        /**
         * Parses control form into a JS Object for passing to sim backend
         *
         * @param {callback} on_fail - Callback to execute on form parsing failure
         *
         * @returns {Object} - Parsed form contents in format expected by sim backend
         */

        // Don't serialize empty fields
        // TODO why does $form.filter(":input") not work here?
        var $params = $($form.selector+" :input").filter(
                function(index, element) {
                    return $(element).val() != "";
                });

        var params = {};
        $params.serializeArray().map(function(x){params[x.name] = x.value;}); 
        
        return params;
    },



    // 
    // Failure functions
    //
    parse_fail: function() {
        // Form parsing failure
        console.log("ERROR: Failed to parse form data, check your input")
    },

    backend_fail: function(data, request) {
        // Backend failure
        console.log("ERROR: Backend error")
    },



    //
    // Highcharts
    // 
    plot_setup: function(ylabel, s) {
        /**
         * Initialise a Highcharts chart in container #sim.i.plot_id
         *
         * @param {string} s - Series options (see Highcharts docs for format)
         *
         * @returns {Object} - Highcharts chart object
         */

        // Default ylabel if none given
        if (ylabel === undefined) {
            ylabel = "Response";
        }

        var chart = new Highcharts.Chart({
            chart: {
                renderTo: sim.i.plot_id,
            },
            title: {
                text: "",
            },
            subtitle: {
                text: "",
            },
            xAxis: {
                title: {
                    text: "Concentration (log scale)"
                },
                labels: {
                    format: "{value}"
                }
            },
            yAxis: [{ // Primary y axis
                id: sim.i.axis_response,
                title: {
                    text: ylabel,
                    style: {'text-transform': 'none'}
                },
                labels: {
                    format: "{value}"
                },
                minPadding: 0,
                maxPadding: 0,
                startOnTick: true,
                endOnTick: true
            }],
            tooltip: {
                shared: true
            },
            series: s
        });

        return chart;
    }

};
 


sim.ic50 = {
    // Internal constants
    i: {
        endpoint:        "/dose-response",
        // Response json object names
        json_response:   "response",
        // Colors for plotting
        color_response:  "rgba(7, 52, 115, 0.4)",
        // Y axis label for plotting
        ylabel:          "Response",
        // jQuery selector for 1to1 form
        form:            "#params-ic50",
        $form:           {}
    },

    init: function() {
        console.log("sim.ic50.init called");

        // Initialise internal jQuery globals
        sim.ic50.i.$form = $(sim.ic50.i.form);

        // Show only selected simulator's form
        sim.i.$forms.hide();
        sim.ic50.i.$form.show();

        // Init new plot, remove old (if it exists)
        if (typeof sim.chart != 'undefined') {
            sim.chart.destroy();
        }
        sim.chart = sim.ic50.plot_setup();

        // Bind/rebind click on plot button to 1:1 plot function
        sim.i.$button.unbind("click");
        sim.i.$button.on("click", sim.ic50.plot);

        // Populate plot
        sim.i.$button.click();
    },

    plot: function() {
        /**
         * Parses control form input, passes to backend and plots result. 
         * Called on plot button click.
         */

        // Top-level function, do everything!
        console.log("sim.ic50.plot called");

        // Parse form into request json for sim api
        request = sim.params_to_json(sim.ic50.i.$form, sim.parse_fail);
        console.log("Parsed request json:");
        console.log(request);

        // Call sim with parsed request
        var endpoint = sim.i.endpoint+sim.ic50.i.endpoint;
        sim.sim_call(request, 
                     endpoint,
                     sim.ic50.plot_update, 
                     sim.backend_fail);


    },

    plot_update: function(points, request) {
        /**
         * Redraws plot with new data
         * 
         * @param {Object} points - New x, y points to plot
         * @param {array} points.dd - Simulated points, format: [[x,y],..n]
         * @param {array} points.mf_h - As above
         * @param {array} points.mf_hg - As above
         */
        console.log("sim.ic50.plot_update called");
        console.log("plot_update: Received returned points");
        console.log(points);
        
        // Plot new data
        sim.chart.get("series-response")
            .setData(points[sim.ic50.i.json_response], false);
        sim.chart.redraw();
    },

    //
    // Highcharts
    // 
    plot_setup: function() {
        /**
         * Initialise a Highcharts chart set up for the 1:1 simulator
         *
         * @returns {Object} - Highcharts chart object
         */

        var series = [{
            id: "series-response",
            name: "Response",
            type: "line",
            yAxis: sim.i.axis_response,
            color: sim.ic50.i.color_response,
            marker: {enabled: false},
            lineWidth: 4,
            tooltip: {
                valueSuffix: "%"
            }
        }];
        
        // Call sim's global plot_setup with series parameters
        return sim.plot_setup(sim.ic50.i.ylabel, series);
    }
};

$(document).ready(sim.on_ready);
