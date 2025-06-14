import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from "@angular/forms";

// Validador que verifica se o email pertence a um domínio específico
export function emailDomainValidator(domain: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const email = control.value as string;
    if (email && email.toLowerCase().endsWith(`@${domain.toLowerCase()}`)) {
      return null; // Válido
    }
    // Inválido
    return { emailDomain: { requiredDomain: domain } };
  };
}

// Validador que verifica se dois campos (senha e confirmação) são iguais
export function matchPasswordValidator(controlName: string, matchingControlName: string): ValidatorFn {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    const passwordControl = formGroup.get(controlName);
    const confirmPasswordControl = formGroup.get(matchingControlName);

    if (!passwordControl || !confirmPasswordControl) {
      return null;
    }

    if (confirmPasswordControl.errors && !confirmPasswordControl.errors['passwordMismatch']) {
      // Se já houver outro erro no campo de confirmação, não faz nada
      return null;
    }

    if (passwordControl.value !== confirmPasswordControl.value) {
      confirmPasswordControl.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      confirmPasswordControl.setErrors(null);
      return null;
    }
  };
}