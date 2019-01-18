// @ngInject
export default ($rootScope, $transitions, spService, modal, CONST) => {

    const webPageConfiguration = {
        pageName: '',
        fromState: ''
    };

    $transitions.onBefore({}, async(trans)=>{
        const permissionedPages = ['entry', 'entries', 'templates'];
        //permissioned pages
        if( permissionedPages.includes(trans.to().name) ){
            const permissions = await spService.getPermissionLevels(CONST.rootFolder, `?$filter=LoginName eq 'Quality Assessment Coordinators' or LoginName eq 'Quality Assessment Members'`);
            if(permissions.length === 0){
                await new Promise((resolve)=>{
                    modal.displayWarning('You do not have access to this page.', ()=>resolve());
                });
                return trans.router.stateService.target('form');
            }
        }
    })

    $transitions.onStart({to:'complete'}, (trans)=>{

        if(trans.from().name){
            angular.extend($rootScope, {
                fromState: trans.from().name 
            });
        } else {
            return trans.router.stateService.target('form');
        }
    });

    angular.merge($rootScope, webPageConfiguration);
    
    $rootScope.setPageName = (pageName) => {
        angular.extend($rootScope, {
            pageName
        });
    };

    
};