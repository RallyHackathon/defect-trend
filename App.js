Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    items: 
    [
        {
            xtype: 'dayrangepicker',
            itemId: 'dayRangePicker',
            defaultSelection: '30',   // 30|60|90
            autoLoadSelection: true
        }
    ],

    dayRange: 90,

    launch: function() {
        this.down('#dayRangePicker').on({
            on30clicked: function() {
                console.log(30);
                this.dayRange = DayRangePicker.THIRTY
                this._getChartData();
            },
            on60clicked: function() {
                console.log(60);
                this.dayRange = DayRangePicker.SIXTY
                this._getChartData();
            },
            on90clicked: function() {
                console.log(90);
                this.dayRange = DayRangePicker.NINETY
                this._getChartData();
            },
            scope: this
        });
    },
    
    _getChartData: function() {

        if (this.down("#myChart")) {
          this.down("#myChart").destroy();
          //this.remove(this.down("#myChart"));
        }

        if (this.myData)
        {
          this._onDefectsLoaded(this.myData);
        }
        else
        {
        Ext.create('Rally.data.lookback.SnapshotStore', {
            listeners: {
                load: function(store,data,success) {
                  this.myData = data;
                  this._onDefectsLoaded(this.myData);
                },
                scope: this
            },
            fetch: ['Name', 'Severity'],
            autoLoad: true,
            context: {
                workspace: '/workspace/41529001',
                project: '/project/279050021',
                projectScopeUp: false,
                projectScopeDown: true,
            },
            hydrate: ['Severity'],
            filters: [
                {
                    property: '_TypeHierarchy',
                    operator: 'in',
                    value: ['Defect']
                },
                {
                    property: 'Severity',
                    operator: 'in',
                    value: ['Minor Problem', 'Major Problem', 'Cosmetic']
                },
                {
                    property: "Project",
                    operator: "in",
                    value: [279050021]
                }

            ],
            scope: this
        });
      }
        
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
        }
    },
    
    _onDefectsLoaded: function (data) {
        // we are going to use lumenize and the TimeSeriesCalculator to aggregate the data into 
        // a time series.


        var lumenize = window.parent.Rally.data.lookback.Lumenize;
        var snapShotData = _.map(data,function(d){return d.data});      
        


        // can be used to 'knockout' holidays
        var holidays = [
            {year: 2014, month: 1, day: 1}  // Made up holiday to test knockout
        ];

        // metrics to chart
        var metrics = [
            {as: 'defectMajor',     f: 'filteredCount', filterField: 'Severity', filterValues: ["Major Problem"]},
            {as: 'defectMinor',   f: 'filteredCount', filterField: 'Severity', filterValues: ["Minor Problem"]},
            {as: 'defectCosmetic', f: 'filteredCount', filterField: 'Severity', filterValues: ["Cosmetic"]}
        ];
 
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
          granularity: lumenize.Time.DAY,
          tz: 'America/Chicago',
          holidays: holidays,
          workDays: 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday',
          summaryMetricsConfig: summaryMetricsConfig,
          deriveFieldsAfterSummary: derivedFieldsAfterSummary,
          deriveFieldsOnInput: deriveFieldsOnInput,
        };
        




        // release start and end dates

        var daysAgo = Ext.Date.add(new Date(), Ext.Date.DAY, -this.dayRange);
        console.log(daysAgo);

        var currentDate = Ext.Date.add(new Date(), Ext.Date.DAY, 0);

        var startOnISOString = Rally.util.DateTime.toIsoString(daysAgo, true);
        var upToDateISOString = Rally.util.DateTime.toIsoString(currentDate, true);
        console.log('start date', startOnISOString);
        console.log('end date', upToDateISOString);
        console.log('days ago', daysAgo);
        //var startOnISOString = new lumenize.Time("2013-09-28").getISOStringInTZ(config.tz)
        //var upToDateISOString = new lumenize.Time("2013-10-28").getISOStringInTZ(config.tz)

        
        // create the c alculator and add snapshots to it.
        //calculator = new Rally.data.lookback.Lumenize.TimeSeriesCalculator(config);
        calculator = new lumenize.TimeSeriesCalculator(config);
        calculator.addSnapshots(snapShotData, startOnISOString, upToDateISOString);

        // create a high charts series config object, used to get the hc series data
        var hcConfig = [ { name : "defectMajor" }, { name : "defectMinor"},{name:"defectCosmetic"}];
        var hcData = lumenize.arrayOfMaps_To_HighChartsSeries(calculator.getResults().seriesData, hcConfig);

        var dt;

        console.log(hcData);

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