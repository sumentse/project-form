// @ngInject
export default ($rootScope, $state, $scope, UserForm) => {

    if(!UserForm){
        $state.go('form');
    }
    
    $rootScope.setPageName('Preview Abstract');

    $scope.init = ()=>{
        angular.merge($scope, {
            form: {...UserForm}
        });
    };

    $scope.init();


};