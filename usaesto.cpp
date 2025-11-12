#include <iostream>
#include <fstream>
using namespace std;

const int MAX_ATOMOS = 100;

struct Atomo {
  int id;
  char simbolo;
  double x, y, z;
  double carga;
};

struct Proteina {
  char nombre[30];
  int num_atomos;
  Atomo atomos[MAX_ATOMOS];
};

void crear_atomos(Atomo coleccion_atomos[1000]) {
    Atomo nuevo_atomo;
    char simbolo;
    float x, y, z, carga;
    int id = 0;

    // Primera posición vacía y cuenta átomos existentes en la coleccion
    bool encontrado_vacio = false;
    for(int i = 0; i < 1000; i++) {
        if (coleccion_atomos[i].simbolo == '\0') {
            id = i;  // Esta es la posición donde insertaremos
            encontrado_vacio = true;
            break;
        }
    }

    if (!encontrado_vacio) {
        cout << "Error: La colección está llena (1000 átomos)" << endl;
        return;
    }

    cout << "ID asignado: " << id << endl;
    nuevo_atomo.id = id;

    cout << "Ingrese el símbolo del átomo: ";
    cin >> simbolo;
while (!(simbolo >= 'A' && simbolo <= 'Z')) {
	cout << "Error: el simbolo tiene que ser mayuscula: ";
	cin >> simbolo;
}
    nuevo_atomo.simbolo = simbolo;

cout << "Ingrese la coordenada X: ";
cin >> x;
while (cin.fail()) {
    cin.clear();
    cin.ignore(10000, '\n');
    cout << "ERROR: valor invalido. Ingrese un numero para X: ";
    cin >> x;
}
nuevo_atomo.x = x;

cout << "Ingrese la coordenada y: ";
	cin >> y;
	while (cin.fail()) {
    		cin.clear();
   		 cin.ignore(10000, '\n');
    		cout << "ERROR: valor invalido. Ingrese un numero para y: ";
    	cin >> y;
}
	nuevo_atomo.y = y;

cout << "Ingrese la coordenada Z: ";
cin >> z;
while (cin.fail()) {
    		cin.clear();
    			cin.ignore(10000, '\n');
    		cout << "ERROR: valor invalido. Ingrese un numero para z: ";
    	cin >> z;
}
	nuevo_atomo.z = z;


char buffer_carga[50];
		cout << "Ingrese la carga del atomo: ";
	cin >> buffer_carga;

for (int i = 0; buffer_carga[i] != '\0'; i++) {
    		if (buffer_carga[i] == ',') {
       		buffer_carga[i] = '.';
    }
}

while (atof(buffer_carga) == 0 && buffer_carga[0] != '0' && buffer_carga[0] != '-') {
    	cout << "ERROR: valor invalido. Ingrese un numero para la carga: ";
    cin >> buffer_carga;
    	for (int i = 0; buffer_carga[i] != '\0'; i++) {
        	if (buffer_carga[i] == ',') {
            		buffer_carga[i] = '.';
        }
    }
}

carga = atof(buffer_carga);
nuevo_atomo.carga = carga;

    // Insertar en la posición encontrada
    coleccion_atomos[id] = nuevo_atomo;

    cout << "Átomo creado exitosamente!" << endl;
}

void guardar_atomos(Atomo coleccion_atomos[1000]) {
    ofstream archivo("atomos.txt");

    if(archivo.is_open()) {
        cout << "GUARDANDO ÁTOMOS..." << endl;

        for(int i = 0; i < 1000; i++) {
            // Verificar si llegamos al final de la colección
            if (coleccion_atomos[i].simbolo == '\0') {
                break;
            }

            // Guardar todos los campos separados por ;
            archivo << coleccion_atomos[i].id << ";"
                    << coleccion_atomos[i].simbolo << ";"
                    << coleccion_atomos[i].x << ";"
                    << coleccion_atomos[i].y << ";"
                    << coleccion_atomos[i].z << ";"
                    << coleccion_atomos[i].carga << endl;

            // Mostrar en terminal lo que se está guardando
            cout << "Guardado: " << coleccion_atomos[i].id << ";"
                 << coleccion_atomos[i].simbolo << ";"
                 << coleccion_atomos[i].x << ";"
                 << coleccion_atomos[i].y << ";"
                 << coleccion_atomos[i].z << ";"
                 << coleccion_atomos[i].carga << endl;
        }

        archivo.close();
        cout << "Se han guardado con éxito los átomos en atomos.txt" << endl;

    } else {
        cout << "Error: No se pudo abrir el archivo para guardar" << endl;
    }
}


void cargar_atomos(Atomo coleccion_atomos[1000]) {
    ifstream archivo("atomos.txt");
    cout << "Cargando datos..." << endl;

    if (archivo.is_open()) {
        char linea[100];
        int indice = 0;

        while (archivo.getline(linea, 100)) {
            char campos[6][100]; // Para almacenar cada campo
            int campo_actual = 0;
            int indice_campo = 0;

            // Separar por ;
            for (int i = 0; linea[i] != '\0'; i++) {
                if (linea[i] == ';') {
                    campos[campo_actual][indice_campo] = '\0';
                    campo_actual++;
                    indice_campo = 0;
                } else {
                    campos[campo_actual][indice_campo++] = linea[i];
                }
            }
            campos[campo_actual][indice_campo] = '\0'; // Último campo

            // CAST a tipo de dato del registro
            Atomo a{
                atoi(campos[0]),    // id
                campos[1][0],       // simbolo (primer carácter)
                atof(campos[2]),    // x
                atof(campos[3]),    // y
                atof(campos[4]),    // z
                atof(campos[5])     // carga
            };

            coleccion_atomos[indice++] = a;
        }

        archivo.close();

        // Mostrar resultados
        cout << "Atomos cargados: " << indice << endl;
        for(int i = 0; i < indice && i < 5; i++) {
            cout << "ID: " << coleccion_atomos[i].id
                 << ", Sim: " << coleccion_atomos[i].simbolo
                 << ", Pos: (" << coleccion_atomos[i].x << ","
                 << coleccion_atomos[i].y << "," << coleccion_atomos[i].z
                 << "), Carga: " << coleccion_atomos[i].carga << endl;
        }

    } else {
        cout << "No se pudo abrir atomos.txt" << endl;
    }
}

void listar_atomos(Atomo coleccion_atomos[1000]) {
	cout << "Se listaran los atomos" << endl;
	for(int i = 0; i < 1000; i++) {
		if(coleccion_atomos [i].simbolo == '\0') {
			break;
	}

	cout << "ID: " << coleccion_atomos [i].id
		<< ", Simbolo: " << coleccion_atomos[i].simbolo
		<< ", X: " << coleccion_atomos[i].x
		<< ", Y: " << coleccion_atomos[i].y
		<< ", Z: " << coleccion_atomos[i].z
		<< ", Carga: " << coleccion_atomos[i].carga
		<< endl;
}

	cout << "Ya se listaron" << endl;
}



int main(){

  Atomo coleccion_atomos[1000];
  //Atomo nuevo_atomo;

  /*
  crear_atomos(coleccion_atomos);
  crear_atomos(coleccion_atomos);
  crear_atomos(coleccion_atomos);
  crear_atomos(coleccion_atomos);
  crear_atomos(coleccion_atomos);

  cout << "En la colección existen: " << endl;
  for (int i=0; i < MAX_ATOMOS; i++){
    if (coleccion_atomos[i].simbolo == '\0') {
      break;
    }
    cout << "El conjunto tiene " << i+1<< " atomos" << endl;
    cout << coleccion_atomos[i].simbolo << endl;
  }
  */  //guardar_atomos(coleccion_atomos);
  cargar_atomos(coleccion_atomos);
  crear_atomos(coleccion_atomos);
  guardar_atomos(coleccion_atomos);
int opcion = 0;

  while(opcion != 6) {
	cout << "1. Cargar" << endl;
	cout << "2. Crear" << endl;
	cout << "3. Listar" << endl;
	cout << "4. Guardar" << endl;
	cout << "Para salir presione 5" << endl;
	cout << "Opcion: ";
	cin >> opcion;

	if (opcion == 1) {
		cargar_atomos(coleccion_atomos);
    	} else if (opcion == 2) {
      		crear_atomos(coleccion_atomos);
    	} else if (opcion == 3) {
	listar_atomos(coleccion_atomos);
   	} else if (opcion == 4) {
	guardar_atomos(coleccion_atomos);
    	} else if (opcion == 5) {
      		cout << "Saliendo del programa..." << endl;
    	} else {
      		cout << "no existe esa opcion" << endl;
    	}
  }

  return 0;
}
