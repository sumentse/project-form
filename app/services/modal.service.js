// @ngInject
export default () => {
    return {      
        $get: /*@ngInject*/ ($uibModal) => {
            return {
                confirmation: (cb)=>{
                    let modalInstance = $uibModal.open({
                        animation: true,
                        appendTo: angular.element(document.querySelectorAll('#angular-container')),
                        controller: ($scope, $uibModalInstance) => {
            
                            $scope.userInput = (answer)=>{
                                $uibModalInstance.close(answer);
                            };
                     
                        },
                        template: `
            <div>
                <header class="modal-header">
                    <button ng-click="userInput(false)" type="button" class="close"><i class="fas fa-close"></i></button>
                </header>
                <main class="modal-body">
                    <div class="text-center">
                        <h3>Are you sure you want to delete?</h3>
                        <div class="text-center">
                            <button class="btn btn-success" style="float:none;" ng-click="userInput(true)">Yes</button>
                            <button class="btn btn-danger" style="float:none;" ng-click="userInput(false)">No</button>
                        </div>
                    </div>
                </main>
                <footer class="modal-footer">
                </footer>
            </div>
                        `,
                        size: 'md'
                    });
            
                    modalInstance.result
                        .then(
                            (userInput) => cb(userInput),
                            (userInput) => cb(userInput)
                        );
             
                },
                displayWarning: (message = '', cb = ()=>{})=>{
                    let modalInstance = $uibModal.open({
                        animation: true,
                        controller: ($scope, $uibModalInstance)=>{
                            $scope.closeModal = () => {
                                $uibModalInstance.close('close');
                            };
                        },
                        template: `
                            <div>
                                <header class="modal-header">
                                    <button ng-click="closeModal()" type="button" class="close"><i class="fas fa-times"></i></button>
                                </header>
                                <main class="modal-body">
                                    <div class="alert alert-danger"><span class="fas fa-exclamation"></span> ${message}</div> 
                                </main>
                                <footer class="modal-footer">
                                </footer>
                            </div>       
                        `,
                        size: 'md'
                    });
            
                    modalInstance.result.then(
                        () => cb(),
                        () => cb()
                    );     
                }
            }

        }
    }
};