'use strict';

const { skip } = require('../common');

skip('begone');

const { WPTRunner } = require('../common/wpt');

const runner = new WPTRunner('compression');

runner.pretendGlobalThisAs('Window');

runner.runJsTests();
