Ext.define('DayRangePicker', {
  extend: 'Ext.Component',
  alias: 'widget.dayrangepicker',
  statics: {  // constants representing selected values
      THIRTY: '30',
      SIXTY: '60',
      NINETY: '90'
  },
  config: {   // default settings
    defaultSelection: '90',
    autoLoadSelection: false
  },
  constructor: function(config) {
    // merge core config and provide custom get/set methods
    this.initConfig(config);
    // validate config
    this._validateSettings();
    // wire up parent
    this.callParent(arguments);
    // define custom click events; logic below will fire them as needed
    this.addEvents('on30clicked', 'on60clicked', 'on90clicked');
    // this picker will listen for OTHER pickers setting their values
    Rally.environment.getMessageBus().subscribe('DayRangePicker.rangeChanged', this._onRangeChanged, this);
  },

  renderTpl: '<span id="{id}-s30">30 days</span>  |  <span id="{id}-s60">60 days</span>  |  <span id="{id}-s90">90 days</span>',
  childEls: ["s30", "s60", "s90"],
  style: {
    textAlign: 'center',
    paddingTop: '5px',
    paddingBottom: '5px;'
  },

  // toggle view of all links depending on which is selected; also fire message to other 30/60/90 widgets
  listeners: {
    on30clicked: function() {
      if(this.s30.hasCls('selected') ){ return; }  // already selected, do nothing
      this.s30.removeCls('selected').removeCls('notselected').addCls('selected');
      this.s60.removeCls('selected').removeCls('notselected').addCls('notselected');
      this.s90.removeCls('selected').removeCls('notselected').addCls('notselected');
      Rally.environment.getMessageBus().publish('DayRangePicker.rangeChanged', DayRangePicker.THIRTY, this);
    },
    on60clicked: function() {
       if(this.s60.hasCls('selected')){ return; } // already selected, do nothing
      this.s60.removeCls('selected').removeCls('notselected').addCls('selected')
      this.s30.removeCls('selected').removeCls('notselected').addCls('notselected');
      this.s90.removeCls('selected').removeCls('notselected').addCls('notselected');
      Rally.environment.getMessageBus().publish('DayRangePicker.rangeChanged', DayRangePicker.SIXTY, this);
    },
    on90clicked: function() {
      if(this.s90.hasCls('selected')) { return; } // already selected, do nothing
      this.s90.removeCls('selected').removeCls('notselected').addCls('selected')
      this.s60.removeCls('selected').removeCls('notselected').addCls('notselected');
      this.s30.removeCls('selected').removeCls('notselected').addCls('notselected');
      Rally.environment.getMessageBus().publish('DayRangePicker.rangeChanged', DayRangePicker.NINETY, this);
    }
  },

  afterRender: function() {

    // assume all links are Off
    this.s30.addCls('notselected');
    this.s60.addCls('notselected');
    this.s90.addCls('notselected');

    // fire specific 30/60/90 public events when the links are clicked
    this.s30.on('click', function() { this.fireEvent('on30clicked'); }, this);
    this.s60.on('click', function() { this.fireEvent('on60clicked'); }, this);
    this.s90.on('click', function() { this.fireEvent('on90clicked'); }, this);
    if (this.getAutoLoadSelection()) {
      // turn On selected link based on default config value
      this['s' + this.getDefaultSelection()].removeCls('notselected').addCls('selected');
      // fire event for selected link
      this.fireEvent('on' + this.getDefaultSelection() + 'clicked'); 
    }
  },

  _onRangeChanged: function(dayRange, source) {
      // skip own range change request messages
      if (source === this) { return; };

      switch(dayRange) {
        case DayRangePicker.THIRTY:
          this.fireEvent('on30clicked');
          break;
        case DayRangePicker.SIXTY:
          this.fireEvent('on60clicked');
          break;
        case DayRangePicker.NINETY:
          this.fireEvent('on90clicked');
          break;
      }
  },

  _validateSettings: function(config) {
    if (!(this.getDefaultSelection() === DayRangePicker.THIRTY ||
          this.getDefaultSelection() === DayRangePicker.SIXTY ||
          this.getDefaultSelection() === DayRangePicker.NINETY)) {
      // TODO: proper error handling?  not sure about try/catch for a widget
      console.error("Invalid 'defaultSelection' setting [" + this.getDefaultSelection() + "].  Must be 30, 60, or 90.  Defaulting to " + DayRangePicker.THIRTY + ".");
      // default to lowest value
      //config.defaultSelection = DayRangePicker.THIRTY;
      this.setDefaultSelection(DayRangePicker.SIXTY);

    }
  }

});