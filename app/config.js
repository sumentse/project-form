// @ngInject
export default ($provide, $compileProvider, emailProvider, spServiceProvider, spFolderProvider, CONST)=>{

    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|s?ftp|mailto|tel|file|javascript):/);

    spServiceProvider.urlDomain(CONST.rootFolder);
    emailProvider.urlDomain(CONST.rootFolder);
    spFolderProvider.urlDomain(CONST.rootFolder);
    
	// $urlRouterProvider.otherwise("/");


    // $stateProvider
    //     .state("", {
    //         url: "/",
    //         controller: "",
    //         templateUrl: ""
    //     });


	//prevent double clicking
    $provide.decorator('ngClickDirective', ($delegate, $timeout) => {
        let original = $delegate[0].compile;
        let delay = 500;
        $delegate[0].compile = (element, attrs, transclude) => {

            let disabled = false;

            let onClick = (evt) => {
                if (disabled) {
                    evt.preventDefault();
                    evt.stopImmediatePropagation();
                } else {
                    disabled = true;
                    $timeout(() => { disabled = false; }, delay, false);
                }
            }
            element.on('click', onClick);

            return original(element, attrs, transclude);
        };
        return $delegate;
    });

    


};