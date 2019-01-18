import detect from 'detect.js';

// @ngInject
export default ($stateProvider, $urlRouterProvider, $locationProvider, CONST) => {

    $urlRouterProvider.otherwise('/form');
    $urlRouterProvider.when('/administration');
    const viewPath = 'views';

    const userOS = () => new Promise((resolve)=>{
        resolve(detect.parse(navigator.userAgent));
    });

    const userProfile = (spService) => new Promise(async(resolve, reject)=>{
        try {
            const userProfile = await spService.getCurrentUser();
            resolve(userProfile);
        } catch(err){
            reject(err);
        }
    });

    const AllUserForm = (spService, CONST) => new Promise(async(resolve, reject)=>{
        let query = new spService.camlQuery(CONST.rootFolder, { listName: CONST.LISTS.form, pageSize: 1000 });
        query.setXML(
            `
            <Query>
                <ViewFields>
                    <FieldRef Name='ID'/>
                    <FieldRef Name='Modified'/>
                    <FieldRef Name='project_title'/>
                    <FieldRef Name='project_leader'/>
                    <FieldRef Name='contact_person'/>
                    <FieldRef Name='has_supporting_documents'/>
                    <FieldRef Name='team_members' JSON='true'/>
                    <FieldRef Name='departments_involved'/>
                    <FieldRef Name='need_assessment'/>
                    <FieldRef Name='project_goals'/>
                    <FieldRef Name='changes_made'/>
                    <FieldRef Name='impact_made'/>
                    <FieldRef Name='discussion'/>
                    <FieldRef Name='green_friendly'/>
                    <FieldRef Name='green_friendly_describe'/>
                    <FieldRef Name='file_attachments' JSON='true'/>
                </ViewFields>
            </Query>
        `);
        
        try {
            const {items} = await query.GetListItems(0);
            resolve(items);
            
        } catch(err){
            resolve(null);
        }        

    });

    const UserForm = ($stateParams, spService, CONST) => new Promise(async(resolve, reject)=>{
        
        const { id } = $stateParams;

        if(id){
            let query = new spService.camlQuery(CONST.rootFolder, { listName: CONST.LISTS.form, pageSize: 1 });
            query.setXML(
                `
                <Query>
                    <ViewFields>
                        <FieldRef Name='ID'/>
                        <FieldRef Name='Modified'/>
                        <FieldRef Name='project_title'/>
                        <FieldRef Name='project_leader'/>
                        <FieldRef Name='contact_person'/>
                        <FieldRef Name='has_supporting_documents'/>
                        <FieldRef Name='team_members' JSON='true'/>
                        <FieldRef Name='departments_involved'/>
                        <FieldRef Name='need_assessment'/>
                        <FieldRef Name='project_goals'/>
                        <FieldRef Name='changes_made'/>
                        <FieldRef Name='impact_made'/>
                        <FieldRef Name='discussion'/>
                        <FieldRef Name='green_friendly'/>
                        <FieldRef Name='green_friendly_describe'/>
                        <FieldRef Name='file_attachments' JSON='true'/>
                    </ViewFields>
                    <Where>
                        <Eq>
                            <FieldRef Name='ID' LookupId='True'/>
                            <Value Type='Lookup'>${id}</Value>
                        </Eq>            
                    </Where>
                </Query>
            `);
            
            try {
                const {items} = await query.GetListItems(0);
                const [result] = items;
                resolve(result);
                
            } catch(err){
                resolve(null);
            }        

        }
    });

    const draftUserForm = (spService, CONST) => new Promise(async(resolve, reject)=>{
        const userProfile = await spService.getCurrentUser();

        let query = new spService.camlQuery(CONST.rootFolder, { listName: CONST.LISTS.form, pageSize: 1 });
        query.setXML(
            `
            <Query>
                <ViewFields>
                    <FieldRef Name='ID'/>
                    <FieldRef Name='Modified'/>
                    <FieldRef Name='project_title'/>
                    <FieldRef Name='project_leader'/>
                    <FieldRef Name='contact_person'/>
                    <FieldRef Name='has_supporting_documents'/>
                    <FieldRef Name='team_members' JSON='true'/>
                    <FieldRef Name='departments_involved'/>
                    <FieldRef Name='need_assessment'/>
                    <FieldRef Name='project_goals'/>
                    <FieldRef Name='changes_made'/>
                    <FieldRef Name='impact_made'/>
                    <FieldRef Name='discussion'/>
                    <FieldRef Name='green_friendly'/>
                    <FieldRef Name='green_friendly_describe'/>
                    <FieldRef Name='file_attachments' JSON='true'/>
                </ViewFields>
                <Where>
                    <And>
                        <Eq>
                            <FieldRef Name="creator_id" />
                            <Value Type="Text">${userProfile.UserProfileProperties.SID.Value}</Value>
                        </Eq>                
                        <Eq>
                            <FieldRef Name="form_status" />
                            <Value Type="Text">draft</Value>
                        </Eq>                
                    </And>
                </Where>
            </Query>
        `);
        
        try {
            const {items} = await query.GetListItems(0);
            const [result] = items;
            resolve(result);
            
        } catch(err){
            resolve(null);
        }

    });

    const hasPageAccess = (spService, CONST) => new Promise(async(resolve)=>{
        const permissions = await spService.getPermissionLevels(CONST.rootFolder, `?$filter=LoginName eq 'Quality Assessment Coordinators' or LoginName eq 'Quality Assessment Members'`);
        if(permissions.length > 0){
            resolve(true);
        } else {
            resolve(false);
        }
    });

    //use this for single pages
    $stateProvider
        .state('form', {
            url: '/form',
            controller: 'form.controller',
            resolve: {
                userProfile,
                userOS,
                draftUserForm
            },
            templateUrl: `${viewPath}/form.html`
        })
        .state('template', {
            url: '/template',
            controller: 'template.controller',
            resolve: {
                userProfile
            },     
            templateUrl: `${viewPath}/template.html`
        })
        .state('complete', {
            url: '/complete',
            templateUrl: `${viewPath}/complete.html`,
            controller: ($rootScope, $scope)=>{
                $rootScope.setPageName('Completed Form');
                $scope.transitionFrom = $rootScope.fromState;
            }
        })
        .state('entries',{
            url: '/entries',
            controller: 'entries.controller',
            templateUrl: `${viewPath}/entries.html`
        })
        .state('entry', {
            url: '/entry/:id',
            controller: 'entry.controller',
            resolve: {
                UserForm
            },
            templateUrl: `${viewPath}/submittedForm.html`
        })
        .state('templates', {
            url: '/templates',
            controller: 'templates.controller',
            templateUrl: `${viewPath}/templates.html`
        })
        .state('print', {
            url: '/print',
            controller: ($window, $scope, $timeout, AllUserForm)=>{
                
                $scope.forms = AllUserForm;

                const afterRender = ()=>{
                    
                    $timeout(()=>{
                        if(document.querySelectorAll('.print').length === 0){
                            afterRender();
                        } else {
                            $window.print();
                        }
                    }, 1000);

                };

                afterRender();

            },
            resolve: {
                AllUserForm
            },
            templateUrl: `${viewPath}/printAbstracts.html`
        })
        .state('error', {
            url: '/404',
            template: `404 - Error`
        });

    if(CONST.htmlMode){
        $locationProvider.htmlMode(true);
    }
};
