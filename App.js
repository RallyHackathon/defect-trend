Ext.define('Rally.ui.picker.SonOfMultiObjectPicker', {
    extend: 'Rally.ui.picker.MultiObjectPicker',
    alias: 'widget.sonofrallymultiobjectpicker',
    _createStoreAndExpand: function() {
console.log('creating store');
            var storeCreator = Ext.create('Rally.data.DataStoreCreator', {
                modelType: this.modelType,
                storeConfig: this.storeConfig,
                storeType: this.storeType
            });
            this.mon(storeCreator, 'storecreate', function(store) {
                this.store = store;
                this.expand();
            }, this, {single: true});
            storeCreator.createStore();
    }
});
Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    dayRange: 30,
    severityValues: [],     // custom values for defect 'severity'
    priorityValues: [],     // custom values for defect 'priority'
    stateValues: [],        // custom values for defect 'state'

    launch: function() {
        this._loadDumbChart();
        this._loadDefectFilterValues();
    },

    _loadDumbChart: function() {
        this.dumbChart = Ext.create("Rally.ui.chart.Chart", {
            itemId: 'dumbChart',
            chartConfig: {
              chart: {
                type: 'area'
            }
          },
            chartData: {
              series: [{
                name: 'USA',
                data: [6]
            }] //[{data: [1,2,3]}] //hcData
            }
        });
        this.add(this.dumbChart);
        this.down("#dumbChart").destroy();


    },

    // kickoff series of async value fetches for Defect attributes (severity, priority, etc)
    _loadDefectFilterValues: function() {
        Rally.data.ModelFactory.getModel({
            type: 'Defect',
            success: function(model) {
                this._loadDefectSeverityValues(model);
            },
            scope: this
        });
    },

    // Load custom defect 'severity' values for the filter pulldown
    _loadDefectSeverityValues: function(model) {
        this.severity = model.getField('Severity');
        console.log(this.severity);
        var store = this.severity.getAllowedValueStore();
        store.load({
            callback: function(data) {
                _.each(data, function(el) {
                    if (el.data.StringValue != "") {this.severityValues.push(el.data.StringValue);}
                }, this);
                console.log("severities", this.severityValues); 
                this._loadDefectPriorityValues(model);
            }, 
            scope: this
        }, this);
    },

    // Load custom defect 'priority' values for the filter pulldown
    _loadDefectPriorityValues: function(model) {
        var priority = model.getField('Priority');
        var store = priority.getAllowedValueStore();
        store.load({
            callback: function(data) {
                _.each(data, function(el) {
                    if (el.data.StringValue != "") {this.priorityValues.push(el.data.StringValue);}
                }, this);
                console.log("priorities", this.priorityValues); 
                this._loadDefectStateValues(model);
            }, 
            scope: this
        }, this);
    },

    // Load custom defect 'state' values for the filter pulldown
    _loadDefectStateValues: function(model) {
        var state = model.getField('State');
        var store = state.getAllowedValueStore();
        store.load({
            callback: function(data) {
                _.each(data, function(el) {
                    if (el.data.StringValue != "") {this.stateValues.push(el.data.StringValue);}
                }, this);
                console.log("state values", this.stateValues); 
                this._loadDayRangeSelector();
            }, 
            scope: this
        }, this);
    },

    // create the 30/60/90 day range selector
    _loadDayRangeSelector: function() {

        this.add({
            xtype: 'dayrangepicker',
            itemId: 'dayRangePicker',
            defaultSelection: '30',   // 30|60|90
            autoLoadSelection: true
        });

        this.down('#dayRangePicker').on({
            on30clicked: function() {
                console.log('day range %i', 30);
                this.dayRange = DayRangePicker.THIRTY;
                this._getChartData();
            },
            on60clicked: function() {
                console.log('day range %i', 60);
                this.dayRange = DayRangePicker.SIXTY;
                this._getChartData();
            },
            on90clicked: function() {
                console.log('day range %i', 90);
                this.dayRange = DayRangePicker.NINETY;
                this._getChartData();
            },
            scope: this
        });

        this._multiSelect();
        this._getChartData();
    },

    _multiSelect: function() {

        var storeData = [];
        _.each(this.severityValues, function(value) {
            storeData.push({_ref: value, ObjectId: value, Name: value});
        });

        this.add({
            xtype: 'sonofrallymultiobjectpicker',
            modelType: 'attributedefinition',
            storeConfig: {
                data: [
                    {Name: 'foo'},
                    {Name: 'bar'},
                    {Name: 'baz'}
                ]
            },
            storeType: 'Rally.data.custom.Store'
        });
    },

    _getFilters: function() {
        var daysAgo = Ext.Date.add(new Date(), Ext.Date.DAY, -this.dayRange);
        var startOnISOString = Rally.util.DateTime.toIsoString(daysAgo, true);

        var filters = 
            [
                {
                    property: '_TypeHierarchy',
                    operator: 'in',
                    value: ['Defect']
                },
                {
                    property: 'Severity',
                    operator: 'in',
                    value: this.severityValues
                },
                {
                    property: "Project",
                    operator: "in",
                    value: [279050021]
                },
                {
                    property: "_ValidTo",
                    operator: ">=",
                    value: startOnISOString
                }
            ];

        
        // var stateValues = _.pluck(this.down('#stateBox').getChecked(), 'inputValue');
        // if (!_.contains(stateValues, "All") && stateValues.length)
        // {
        //     filters.push({
        //         property: "State",
        //         operator: "in",
        //         value: stateValues
        //     });
        // }

        // var priorityValues = _.pluck(this.down('#priorityBox').getChecked(), 'inputValue');
        // if (!_.contains(priorityValues, "All"))
        // {
        //     filters.push({
        //         property: "Priority",
        //         operator: "in",
        //         value: priorityValues
        //     });
        // }

        return filters;

    },
    
    _getChartData: function() {

        console.log('in get chart data');

        var myFilters = this._getFilters();

        if (this.down("#myChart")) {
          this.down("#myChart").destroy();
          //this.remove(this.down("#myChart"));
        }

        
        Ext.create('Rally.data.lookback.SnapshotStore', {
            listeners: {
                load: function(store,data,success) {
                  this._onDefectsLoaded(data);
                },
                scope: this
            },
            fetch: ['Name', 'Severity'],
            autoLoad: true,
            context: {
                workspace: '/workspace/41529001',
                project: '/project/279050021',
                projectScopeUp: false,
                projectScopeDown: true
            },
            hydrate: ['Severity'],
            filters: myFilters,
            scope: this
        });
      
        
    },
    
    _getChartConfiguration: function() {
        return{
          chart: {
                type: 'area'
            },
            title: {
                text: 'Historic and Estimated Worldwide Population Growth by Region'
            },
            subtitle: {
                text: 'Source: Wikipedia.org'
            },
            xAxis: {
                type: 'datetime'
            },
            yAxis: {
                title: {
                    text: 'Count'
                },
                labels: {
                    formatter: function() {
                        return this.value;
                    }
                }
            },
            tooltip: {
                shared: true
            },
            plotOptions: {
                area: {
                    stacking: 'normal',
                    lineColor: '#666666',
                    lineWidth: 1,
                    marker: {
                        lineWidth: 1,
                        lineColor: '#666666'
                    }
                }
            }
        };
    },
    
    _onDefectsLoaded: function (data) {
        // we are going to use lumenize and the TimeSeriesCalculator to aggregate the data into 
        // a time series.


        var snapShotData = _.map(data,function(d){return d.data;});      

        // can be used to 'knockout' holidays
        var holidays = [
            {year: 2014, month: 1, day: 1}  // Made up holiday to test knockout
        ];

        // metrics to chart
        // var metrics = [
        //     {as: 'defectMajor',     f: 'filteredCount', filterField: 'Severity', filterValues: ["Major Problem"]},
        //     {as: 'defectMinor',   f: 'filteredCount', filterField: 'Severity', filterValues: ["Minor Problem"]},
        //     {as: 'defectCosmetic', f: 'filteredCount', filterField: 'Severity', filterValues: ["Cosmetic"]}
        // ];

        var metrics = [];
        _.each(this.severityValues, function(value) {
            metrics.push({
                as: value, f: 'filteredCount', filterField: 'Severity', filterValues: [value]
            });
        });
        console.log(metrics);
 
        // not used yet
        var summaryMetricsConfig = [
        ];
        
        var derivedFieldsAfterSummary = [
        ];

        // not used yet
        var deriveFieldsOnInput = [
        ];
        
        // small change
        
        // calculator config
        var config = {
          metrics: metrics,
          granularity: 'day',
          tz: 'America/Chicago',
          holidays: holidays,
          workDays: 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday',
          summaryMetricsConfig: summaryMetricsConfig,
          deriveFieldsAfterSummary: derivedFieldsAfterSummary,
          deriveFieldsOnInput: deriveFieldsOnInput
        };
        




        // release start and end dates

        var daysAgo = Ext.Date.add(new Date(), Ext.Date.DAY, -this.dayRange);

        var currentDate = Ext.Date.add(new Date(), Ext.Date.DAY, 0);

        var startOnISOString = Rally.util.DateTime.toIsoString(daysAgo, true);
        var upToDateISOString = Rally.util.DateTime.toIsoString(currentDate, true);
        //var startOnISOString = new lumenize.Time("2013-09-28").getISOStringInTZ(config.tz)
        //var upToDateISOString = new lumenize.Time("2013-10-28").getISOStringInTZ(config.tz)

        
        // create the c alculator and add snapshots to it.
        //calculator = new Rally.data.lookback.Lumenize.TimeSeriesCalculator(config);
        calculator = new Rally.data.lookback.Lumenize.TimeSeriesCalculator(config);

        calculator.addSnapshots(snapShotData, startOnISOString, upToDateISOString);

        // create a high charts series config object, used to get the hc series data

        var hcConfig = []
        _.each(this.severityValues, function(value) {
            hcConfig.push({name: value});
        });

        //var hcConfig = [ { name : "defectMajor" }, { name : "defectMinor"},{name:"defectCosmetic"}];
        var hcData = Rally.data.lookback.Lumenize.arrayOfMaps_To_HighChartsSeries(calculator.getResults().seriesData, hcConfig);

        var dt;


        _.each(hcData, function(seriesObj) {
            dt = Ext.Date.format(daysAgo, 'Y-m-d').split("-");
            seriesObj.pointStart = Date.UTC(dt[0], dt[1] - 1, dt[2]);
            seriesObj.pointInterval = 24 * 3600 * 1000;
        });


        var myChart = Ext.create("Rally.ui.chart.Chart", {
            chartConfig: this._getChartConfiguration(),
            chartData: {
                series: hcData
            },
            itemId: 'myChart'
        });
        this.add(myChart);
        Ext.util.Observable.capture(myChart, function(e)
        {
          console.log('chart %s - %s', myChart.getId(), e);
          return true;
        });
    }
});
