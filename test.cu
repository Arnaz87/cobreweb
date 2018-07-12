import cobre.system { void println (string); }
import cobre.string { string itos (int); }

// División con restas sucesivas.
int, int division (int num, int denom) {
  int resto = num, resul = 0;
  while (resto >= denom) {
    resto = resto-denom;
    resul = resul+1;
  }
  return resul, resto;
}

void main () {
  int num = 10;
  int denom = 3;
  
  if (denom == 0) {
    println("División por Cero!");
    return;
  }

  int resto, resul;
  resul, resto = division(num, denom);
  
  println(
    itos(num) + "/" + itos(denom)
    + " = " +
    itos(resul) + "%" + itos(resto)
  );
}