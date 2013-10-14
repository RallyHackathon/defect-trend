Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    launch: function() {
        this._getChartData();
    },
    
    _getChartData: function() {
        Ext.create('Rally.data.lookback.SnapshotStore', {
            listeners: {
                load: this._onDefectsLoaded,
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
    
    _onDefectsLoaded: function (store,data,success) {
        // we are going to use lumenize and the TimeSeriesCalculator to aggregate the data into 
        // a time series.
        var lumenize = window.parent.Rally.data.lookback.Lumenize;
        var snapShotData = _.map(data,function(d){return d.data});      
        
        console.log("snapshots:",data);


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
          workDays: 'Monday,Tuesday,Wednesday,Thursday,Friday',
          summaryMetricsConfig: summaryMetricsConfig,
          deriveFieldsAfterSummary: derivedFieldsAfterSummary,
          deriveFieldsOnInput: deriveFieldsOnInput,
        };
        
        // release start and end dates
        var startOnISOString = new lumenize.Time("2013-01-01").getISOStringInTZ(config.tz)
        var upToDateISOString = new lumenize.Time("2013-01-30").getISOStringInTZ(config.tz)
        
        // create the calculator and add snapshots to it.
        //calculator = new Rally.data.lookback.Lumenize.TimeSeriesCalculator(config);
        calculator = new lumenize.TimeSeriesCalculator(config);
        calculator.addSnapshots(snapShotData, startOnISOString, upToDateISOString);

        // create a high charts series config object, used to get the hc series data
        var hcConfig = [ { name : "defectMajor" }, { name : "defectMinor"},{name:"defectCosmetic"}];
        var hcData = lumenize.arrayOfMaps_To_HighChartsSeries(calculator.getResults().seriesData, hcConfig);

        _.each(hcData, function(seriesObj) {
            seriesObj.pointStart = Date.UTC(2013, 0, 1);
            seriesObj.pointInterval = 24 * 3600 * 1000
        });

        console.log("hc: ", hcData);

        var myChart = Ext.create("Rally.ui.chart.Chart", {
            chartConfig: this._getChartConfiguration(),
            chartData: {
                series: hcData
            }
        });
        
        this.add(myChart);
    }
});
