Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    launch: function() {
        var myChart = Ext.create("Rally.ui.chart.Chart", {
            chartConfig: this._getChartConfiguration(),
            chartData: this._getChartData()
        });
        
        this.add(myChart);

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
                type: 'datetime',
                dateTimeLabelFormats: {day:'%e of %b'}
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
                shared: true,
                valueSuffix: ' millions'
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
    
    _getChartData: function() {
        Ext.create('Rally.data.lookback.SnapshotStore', {
            listeners: {
                load: this._onReleaseSnapShotData
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
                    value: ['Minor Problem']
                },
                {
                    property: "Project",
                    operator: "in",
                    value: [279050021]
                }
                // {
                //     propert: "__At",
                //     value: "2013-09-22T00:00:00Z"
                // }
            ],
            scope: this
        });
        
        var criticalSeries = [2, 5, 8, 9, 14, 6, 2,2, 5, 8, 9, 14, 6, 2];
        
        
        return {series: [{
                name: 'Critical',
                data: criticalSeries,
                pointStart: Date.UTC(2013,0,1),
                pointInterval: 24*3600*1000
            }
            // , 
            // {
            //     name: 'Africa',
            //     data: [106, 107, 111, 133, 221, 767, 1766]
            // }, {
            //     name: 'Europe',
            //     data: [163, 203, 276, 408, 547, 729, 628]
            // }, {
            //     name: 'America',
            //     data: [18, 31, 54, 156, 339, 818, 1201]
            // }, {
            //     name: 'Oceania',
            //     data: [2, 2, 2, 6, 13, 30, 46]
            // }
        ]}
        
    },
    
    _onReleaseSnapShotData: function (store,data,success) {
        // we are going to use lumenize and the TimeSeriesCalculator to aggregate the data into 
        // a time series.
        var that = this;
        var lumenize = window.parent.Rally.data.lookback.Lumenize;
        var snapShotData = _.map(data,function(d){return d.data});      
        
        console.log("snapshot data:",data);


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
          deriveFieldsOnInput: deriveFieldsOnInput,
          metrics: metrics,
          summaryMetricsConfig: summaryMetricsConfig,
          deriveFieldsAfterSummary: derivedFieldsAfterSummary,
          granularity: lumenize.Time.DAY,
          tz: 'America/Chicago',
          holidays: holidays,
          workDays: 'Monday,Tuesday,Wednesday,Thursday,Friday'
        };
        
        // release start and end dates
        var startOnISOString = new lumenize.Time("2013-01-01").getISOStringInTZ(config.tz)
        var upToDateISOString = new lumenize.Time("2013-02-02").getISOStringInTZ(config.tz)
        
        // create the calculator and add snapshots to it.
        //calculator = new Rally.data.lookback.Lumenize.TimeSeriesCalculator(config);
        calculator = new lumenize.TimeSeriesCalculator(config);
        calculator.addSnapshots(snapShotData, startOnISOString, upToDateISOString);

        // create a high charts series config object, used to get the hc series data
        var hcConfig = [{ name: "label" }, { name : "defectMajor" }, { name : "defectMinor"},{name:"defectCosmetic"}];
        var hc = lumenize.arrayOfMaps_To_HighChartsSeries(calculator.getResults().seriesData, hcConfig);

        // display the chart
        
        //this._showChart(hc);
        
        console.log("hc: ", hc);
                
    }
    
    
});
