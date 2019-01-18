// @ngInject
import settings from './components/administration.settings.controller';
import administration from './components/administration.controller';

angular.module('administration.module', [])
    .controller('administration.controller', administration)
    .controller('administration.settings.controller', settings)

export default 'administration.module';
