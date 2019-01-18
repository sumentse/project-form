// @ngInject
import 'angular-async-await';
import naturalSort from 'javascript-natural-sort';
import lodash from 'lodash';
import CSV from './csv.exporter';
import spRest from './spRest.service';
import spFolder from './spFolder.service';
import spEmail from './email.service';
import modal from './modal.service';

angular.module('app.services', ['angular-async-await'])
    .provider('spService', spRest)
    .provider('spFolder', spFolder)
    .provider('email', spEmail)
    .provider('modal', modal)
    .provider('CSV', CSV)
    .factory('_', () => lodash)
    .factory('naturalSort', () => naturalSort)

export default 'app.services';