import {Component, Inject, OnInit, NgZone} from '@angular/core';
import {Http} from '@angular/http';
import {Observable} from 'rxjs/Observable';
declare let Plotly: any;

@Component({
    selector: 'watchlist',
    templateUrl: './watchlist.component.html',
    styleUrls: ['./watchlist.component.css']
})

export class WatchlistComponent implements OnInit {

    _watchlists: Array<WatchlistComponent> = [];
    _watchlistElements: Array<WatchlistComponent> = [];
    _values: Array<WatchlistComponent> = [];
    _oldValues: Array<WatchlistComponent> = [];
    xid: string;
    value: string;
    ts: number;
    name: any;
    type: string;
    loadPoints;
    chartData = [];
    isFillingDataNeeded: boolean = true;
    lastActualization = new Date();
    selectedWatchlist;
    chartLayout;
    multistatesOrBinariesDetected: boolean = false;
    checkForMultistatesAndBinaries: boolean = true;
    isLinearChart: boolean = true;
    isChartHidden: boolean = true;
    values;
    help2: boolean = true;
    plot;
    range1: number;
    range2: number;
    dd: any = new Date();
    dateFrom: number = 5;
    dateFromUnit: string = 'seconds';
    zoomEvent: boolean = true;
    isRequestTimeRangeActiveAndUndone: boolean = false;
    isRequestSpecifiedTimeActiveAndUndone: boolean = false;
    isAnyRequestActive: boolean = false;
    dateRange1: any;
    dateRange2: any;
    motherOfDragons: boolean = true;
    chart: boolean = true;
    activeState: string;
    isRedrawingStopped: boolean = false;


    constructor(@Inject(Http) private http: Http, public zone: NgZone) {
        this.http.get(`/ScadaBR/api/watchlist/getNames`)
            .subscribe(res => this._watchlists = res.json());
        setTimeout(() => {
            this.updateWatchlistTable(this._watchlists[0].xid);
            this.selectedWatchlist = this._watchlists[0];
            this.initiateInterval();
        }, 500);
        this.chartLayout = {
            showlegend: true,
            legend: {
                "orientation": "h",
                bgcolor: 'transparent',
                y: -0.17
            }
        };
    };

    updateWatchlistTable(xid) {
        this.checkForMultistatesAndBinaries = true;
        this._watchlistElements = [];
        this.http.get(`/ScadaBR/api/watchlist/getPoints/${xid}`)
            .subscribe(res => {
                this._watchlistElements = res.json();
                this.liveChart();
            });
        this.activeState = '';
        this.initiateChart();
        this.autorangeChart();
        this.motherOfDragons = true;
    };

    fillDataWithScheme() {
        this._values.forEach((_, i) => {
            this.chartData.push({
                x: [],
                y: [],
                name: '',
                line: {shape: '', width: 1},
                mode: 'lines+markers'
            });
            if (this._values[i].type !== 'NumericValue') {
                this.chartData[i]['yaxis'] = 'y2';
                this.chartData[i]['line'].shape = 'hv';
            }
        });
        this.chartData.forEach((v, i) => v.name = this._values[i].name);
        this.isFillingDataNeeded = false;
        console.log('filling successful!');
    }

    getDataFromTimeRange() {
        this.isAnyRequestActive = true;
        clearInterval(this.loadPoints);
        this.isRequestTimeRangeActiveAndUndone = true;
        this.isRedrawingStopped = true;
        this.chartData.forEach(v => {
            v.x = [];
            v.y = []
        });
        Observable.forkJoin(
            this._watchlistElements.map(v => {
                return this.http.get(`/ScadaBR/api/watchlist/getChartData/${v.xid}/${(Date.parse(this.dateRange1) - 3600000)}/${(Date.parse(this.dateRange2) - 3600000)}`)
                    .map(res => res.json());
            })
        ).subscribe(res => {
            this._oldValues = res;
            this.chartData.forEach((_, i) => this._oldValues[i].values.forEach((_, j) => this.chartData[i].x.push(new Date(this._oldValues[i].values[j].ts)) && this.chartData[i].y.push(this._oldValues[i].values[j].value)));
            console.log('loaded data time range');
            this.chartLayout.xaxis = {range: [this.dateRange1, this.dateRange2]};
            this.redrawChart();
            this.isRequestTimeRangeActiveAndUndone = false;
            this.isChartHidden = false;
            this.isAnyRequestActive = false;
        });
        this.activeState = 'timeRange';
    }

    getDataFromSpecifiedTimeToNow() {
        this.zoomEvent = false;
        this.isAnyRequestActive = true;
        this.isRequestSpecifiedTimeActiveAndUndone = true;
        this.deactivateInterval();
        this.chartData.forEach(v => {
            v.x = [];
            v.y = []
        });
        Observable.forkJoin(
            this._watchlistElements.map(v => {
                return this.http.get(`/ScadaBR/api/point_value/getValuesFromTime/${Date.parse(this.getDate()) - (this.dateFrom * 1000 * (this.dateFromUnit == 'minutes' ? 60 : this.dateFromUnit == 'hours' ? 3600 : 1))}/${v.xid}`)
                    .map(res => res.json());
            })
        ).subscribe(res => {
            this._oldValues = res;
            this.chartData.forEach((_, i) => this._oldValues[i].values.forEach((_, j) => this.chartData[i].x.push(new Date(this._oldValues[i].values[j].ts)) && this.chartData[i].y.push(this._oldValues[i].values[j].value)));
            this.initiateInterval();
            this.redrawChart();
            console.log('loaded data from specified time to now');
            this.autorangeChart();
            this.isRequestSpecifiedTimeActiveAndUndone = false;
            this.isChartHidden = false;
            this.isAnyRequestActive = false;
        });
        this.activeState = 'specifiedTime';
    }

    loadNewDataAfterZoom() {
        clearInterval(this.loadPoints);
        this.isRedrawingStopped = true;
        this.range1 = Date.parse(this.chartLayout.xaxis.range[0]);
        this.range2 = Date.parse(this.chartLayout.xaxis.range[1]);
        this.chartData.forEach(v => {
            v.x = [];
            v.y = []
        });
        Observable.forkJoin(
            this._watchlistElements.map(v => {
                return this.http.get(`/ScadaBR/api/watchlist/getChartData/${v.xid}/${this.range1}/${this.range2}`)
                    .map(res => res.json());
            })
        ).subscribe(res => {
            this._oldValues = res;
            this.chartData.forEach((_, i) => this._oldValues[i].values.forEach((_, j) => this.chartData[i].x.push(new Date(this._oldValues[i].values[j].ts)) && this.chartData[i].y.push(this._oldValues[i].values[j].value)));
            this.redrawChart();
            if (Date.parse(this.chartLayout.xaxis.range[1]) >= Date.parse(this.getDate())) {
                this.isRedrawingStopped = false;
                this.initiateInterval();
            }
            console.log('loaded data after zoom');
            this.isAnyRequestActive = false;
        });
    }

    liveChart() {
        Observable.forkJoin(
            this._watchlistElements.map(v => {
                return this.http.get(`/ScadaBR/api/point_value/getValue/${v.xid}`)
                    .map(res => res.json());
            })
        ).subscribe(res => {
            this._values = res;

            if (this.isFillingDataNeeded) {
                this.fillDataWithScheme();
            }

            if (this.checkForMultistatesAndBinaries) {
                for (let i = 0; i < this._values.length; i++) {
                    if (this._values[i].type == 'BinaryValue' || this._values[i].type == 'MultistateValue') {
                        this.multistatesOrBinariesDetected = true;
                        break;
                    } else {
                        this.multistatesOrBinariesDetected = false;
                    }
                }
                if (this.multistatesOrBinariesDetected) {
                    this.chartLayout.yaxis2 = {
                        titlefont: {color: '#000'},
                        tickfont: {color: '#aa00ff'},
                        overlaying: 'y',
                        side: 'right',
                        showticklabels: true,
                        gridcolor: '#eeccff'
                    }
                }
                this.initiateChart();
                this.checkForMultistatesAndBinaries = false;
            }

            this.plot = document.getElementById('plotly');
            if (this.motherOfDragons) {
                this.plot.on('plotly_relayout', () => {
                    this.zone.run(() => {
                    if (this.zoomEvent) {
                        this.loadNewDataAfterZoom();
                        this.isAnyRequestActive = true;
                    }
                    this.isRedrawingStopped = false;
                    });

                });

                for (let i = 0; i < 11; i++) {
                    document.getElementsByClassName('drag')[i].addEventListener('mousedown', () => {
                        console.log('mousedown' + i);
                        this.isRedrawingStopped = true;
                        this.zoomEvent = true;
                    });
                }
                this.motherOfDragons = false;
            }

            this.help2 = true;
            this.chartData.forEach((v, i) => v.x.push(new Date()) && v.y.push(this._values[i].value));
            if (this.isRedrawingStopped == false) {
                console.log('redrawing chart!');
                this.redrawChart();
            }
            this.chartData.forEach(v => v['mode'] = 'lines');
            console.log(this.chartData);
        });

    };

    //helping functions
    increaseChartLineWidth() {
        this.chartData.map(v => v['line'].width += 1);
        this.redrawChart();
    }

    decreaseChartLineWidth() {
        if (this.chartData[0]['line'].width > 1) {
            this.chartData.map(v => v['line'].width -= 1);
            this.redrawChart();
        }
    }

    toSplineChart() {
        this.isLinearChart = false;
        for (let i = 0; i < this._values.length; i++) {
            if (this._values[i].type == 'NumericValue') {
                this.chartData[i]['line'].shape = 'spline';
            }
        }
        this.redrawChart();
    }

    toLinearChart() {
        this.isLinearChart = true;
        for (let i = 0; i < this._values.length; i++) {
            if (this._values[i].type == 'NumericValue') {
                this.chartData[i]['line'].shape = 'linear';
            }
        }
        this.redrawChart();
    }

    initiateChart() {
        Plotly.newPlot('plotly', this.chartData, this.chartLayout);
    }

    redrawChart() {
        Plotly.redraw('plotly', this.chartData, this.chartLayout);
    }

    autorangeChart() {
        Plotly.relayout('plotly', {
            'xaxis.autorange': true,
            'yaxis.autorange': true
        });
    }

    cleanChartBeforeDraw() {
        this.chartData = [];
        this.isFillingDataNeeded = true;
        Plotly.newPlot('plotly', this.chartData);
    }

    initiateInterval() {
        this.loadPoints = setInterval(() => {
            this.liveChart();
        }, 5000);
    }

    deactivateInterval() {
        clearInterval(this.loadPoints);
    }

    getDate: any = function () {
        return new Date();
    };

    setDefaultTimeRangeValues() {
        this.dateRange1 = `${this.dd.getFullYear()}-${this.dd.getMonth() < 10 ? '0' + (this.dd.getMonth() + 1) : this.dd.getMonth() + 1}-${this.dd.getDate() < 10 ? '0' + this.dd.getDate() : this.dd.getDate()}T${this.dd.getHours() < 10 ? '0' + this.dd.getHours() : this.dd.getHours()}:${this.dd.getMinutes() < 10 ? '0' + this.dd.getMinutes() : this.dd.getMinutes()}`;
        this.dateRange2 = `${this.dd.getFullYear()}-${this.dd.getMonth() < 10 ? '0' + (this.dd.getMonth() + 1) : this.dd.getMonth() + 1}-${this.dd.getDate() < 10 ? '0' + this.dd.getDate() : this.dd.getDate()}T${this.dd.getHours() < 10 ? '0' + this.dd.getHours() : this.dd.getHours()}:${this.dd.getMinutes() < 10 ? '0' + this.dd.getMinutes() : this.dd.getMinutes()}`;
    }

    setRanges() {
        let date1 = this.chartLayout.xaxis.range[0];
        let date2 = this.chartLayout.xaxis.range[1];
        this.dateRange1 = date1.slice(0, -8).split(" ").join("T");
        this.dateRange2 = date2.slice(0, -8).split(" ").join("T");
    }

    ngOnInit() {
        this.setDefaultTimeRangeValues();
        this.initiateChart();
    }

    ngOnDestroy() {
        clearInterval(this.loadPoints);
    }

}

// for (let i = 0; i < this.chartData.length; i++) {
//     for (let j = 0; j < this._oldValues[i].values.length; j++) {
//         this.chartData[i].x.push(new Date(this._oldValues[i].values[j].ts)) && this.chartData[i].y.push(this._oldValues[i].values[j].value)
//     }
// }
// for (let i = 1; i < 11; i++) {
//     document.getElementsByClassName('drag')[i].addEventListener('mouseup', () => {
//         this.chart = true;
//         console.log('mouseup'+i);
//
//     });
// }