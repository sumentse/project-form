'use strict';
import 'babel-polyfill';
import angular from 'angular';
import './controllers';
import './services';
import './directives';
import './filters';
import startup from './run';
import CONST from './const';
import appConfiguration from './config';
import routes from './routes';

angular.module('app', [
	'app.controllers',
	'app.services',
	'app.directives',
	'app.filters'
])
.constant('CONST', CONST)
.config(appConfiguration)
.config(routes)
.run(startup);
