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
        console.log("Get chart data");        
        Ext.create('Rally.data.lookback.SnapshotStore', {
            listeners: {
                load: function(store, data, success) {
                    console.log("data, " , data);
                }
            },
            fetch: ['Name'],
            autoLoad: true,
            context: {
                workspace: '/workspace/41529001',
                project: '/project/279050021',
                projectScopeUp: false,
                projectScopeDown: true,
            },
            filters: [
                {
                    property: '_TypeHierarchy',
                    operator: 'in',
                    value: ['Defect']
                },
                {
                    property: 'Severity',
                    operator: '=',
                    value: ['Minor Problem']
                }
                // {
                //     propert: "__At",
                //     value: "2013-09-22T00:00:00Z"
                // }
            ]
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
        
    }
    
    
});
