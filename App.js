Ext.define('Rally.ui.picker.SonOfMultiObjectPicker', {
    extend: 'Rally.ui.picker.MultiObjectPicker',
    alias: 'widget.sonofrallymultiobjectpicker',
    _createStoreAndExpand: function() {
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

        this.add({
            xtype: 'panel',
            layout: {
                type: 'hbox'
            },
            itemId: 'multiselect'
        });

        Rally.sdk.dependencies.Analytics.load(this._loadDefectFilterValues, this);
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
        var store = this.severity.getAllowedValueStore();
        store.load({
            callback: function(data) {
                _.each(data, function(el) {
                    if (el.data.StringValue !== "") {this.severityValues.push(el.data.StringValue);}
                    else {this.severityValues.push("None");}
                }, this);
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
                this._loadDayRangeSelector();
            }, 
            scope: this
        }, this);
    },



    // create the 30/60/90 day range selector
    _loadDayRangeSelector: function() {

        this.down('#multiselect').add({
            xtype: 'dayrangepicker',
            itemId: 'dayRangePicker',
            defaultSelection: '30',   // 30|60|90
            autoLoadSelection: true,
            margin: 5
        });

        this.down('#dayRangePicker').on({
            on30clicked: function() {
                this.dayRange = DayRangePicker.THIRTY;
                this._getChartData();
            },
            on60clicked: function() {
                this.dayRange = DayRangePicker.SIXTY;
                this._getChartData();
            },
            on90clicked: function() {
                this.dayRange = DayRangePicker.NINETY;
                this._getChartData();
            },
            scope: this
        });

        this._multiSelect();
        this._getChartData();
    },


    _multiSelect: function() {
        this._createMultiPicker(this.priorityValues, "Priorities");
        this._createMultiPicker(this.stateValues, "States");
        this.down('#multiselect').add(
        {
            xtype: 'button',
            text: 'Go!',
            margin: 5,
            handler: function() {
                this._getChartData();
            },
            scope: this
        });

    },

    _createMultiPicker: function(values, title) 
    {
        var storeData = [];
        _.each(values, function(value, i) {
            storeData.push({Name: value, ObjectID: i, _CreatedAt: i});
        });

        this.down('#multiselect').add({
            xtype: 'sonofrallymultiobjectpicker',
            itemId: title,
            margin: 5,
            modelType: 'attributedefinition',
            config: {selectionKey: '_CreatedAt'},
            placeholderText: title,
            storeConfig: {
                data: storeData
            },
            listeners:
            {
                select: function() {
                    console.log(this._getSelectedValues("#" + title));
                },
                scope: this
            },
            storeType: 'Rally.data.custom.Store'
        });
    },

    _getSelectedValues: function(id) {
        var picker = this.down(id);
        var selected = [];
        if (picker) {
            _.each(picker.selectedValues.items, function(val) {
                selected.push(val.data.Name);
            });
        }
        return selected;
    },

    _getChartFilters: function() {
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
                    value: this.severityValues        // TODO: handle 'empty' or not selected severity
                },
                {
                    property: "Project",
                    value: this.getContext().getProject().ObjectID
                },
                {
                    property: "_ValidTo",
                    operator: ">=",
                    value: startOnISOString
                }
            ];

            var stateValues = this._getSelectedValues("#States");
            if (stateValues.length)
            {
                filters.push({
                    property: "State",
                    operator: "in",
                    value: stateValues
                });
            }

            var priorityValues = this._getSelectedValues("#Priorities");
            if (priorityValues.length)
            {
                filters.push({
                    property: "Priority",
                    operator: "in",
                    value: priorityValues
                });
            }

        return filters;

    },
    
    _getChartData: function() {

        if (this.down('#myChart')) {
            this.down('#myChart').destroy();
        }

        if (this.down('#multiselect').down('#labels')){
            this.down('#multiselect').down('#labels').destroy();
        }

        this.down("#multiselect").add({
            xtype: 'panel',
            items: 
            [
                {   
                    xtype: 'text',
                    text: 'Priority Filters: ' + this._getSelectedValues("#Priorities"),
                    margin: '0 0 10 10'
                },
                {   
                    xtype: 'text',
                    text: 'State Filters: ' + this._getSelectedValues("#States"),
                    margin: '0 0 10 10'
                },
            ],
            layout: {
                type: "vbox"
            },
            margin: '0 0 10 10',
            itemId: "labels",
            border: false
        });

        var myFilters = this._getChartFilters();
        
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
                workspace: this.getContext().getWorkspace()._ref,
                project: this.getContext().getProject()._ref,
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
                type: 'area',
                zoomType: 'x'
            },
            title: {
                text: 'Defect Trend'
            },
            subtitle: {
                text: 'Severity'
            },
            xAxis: {
                type: 'datetime',
                maxZoom: 1 * 24 * 3600000
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

        var snapShotData = _.map(data,function(d){return d.data;});


        var metrics = [];
        _.each(this.severityValues, function(value) {
            metrics.push({
                as: value, f: 'filteredCount', filterField: 'Severity', filterValues: [value]
            });
        });
         
        // calculator config
        var config = {
          metrics: metrics,
          granularity: 'day',
          tz: 'America/Chicago',
          workDays: 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday'
        };
        
        var daysAgo = Ext.Date.add(new Date(), Ext.Date.DAY, -this.dayRange);

        var currentDate = Ext.Date.add(new Date(), Ext.Date.DAY, 0);

        var startOnISOString = Rally.util.DateTime.toIsoString(daysAgo, true);
        var upToDateISOString = Rally.util.DateTime.toIsoString(currentDate, true);

        
        calculator = new Rally.data.lookback.Lumenize.TimeSeriesCalculator(config);

        calculator.addSnapshots(snapShotData, startOnISOString, upToDateISOString);


        var hcConfig = [];
        _.each(this.severityValues, function(value) {
            hcConfig.push({name: value});
        });

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

        chart = this.down("#myChart");

        // HACK: need to remove load mask on high-charts due to lumenize lib loading issue
        var p = Ext.get(chart.id);
        elems = p.query("div.x-mask");
        _.each(elems, function(e) { e.remove(); });
        var elems = p.query("div.x-mask-msg");
        _.each(elems, function(e) { e.remove(); });
    }
});

