import * as yaml from 'js-yaml';
import { YAML_OPTIONS } from '../config/constants.js';
import { projectDatabaseSchema, type ProjectDatabase } from '../types/schemas.js';

/**
 * Serializes data to YAML string, ensuring it conforms to the schema.
 */
export function serializeToYaml(data: ProjectDatabase): string {
  try {
    // Ensure data is valid before serializing
    const validatedData = projectDatabaseSchema.parse(data);
    return yaml.dump(validatedData, YAML_OPTIONS);
  } catch (error) {
    console.error('Error serializing to YAML:', error);
    throw error;
  }
}

/**
 * Generic YAML serialization for any data type
 */
export function serializeDataToYaml(data: any): string {
  try {
    return yaml.dump(data, YAML_OPTIONS);
  } catch (error) {
    console.error('Error serializing data to YAML:', error);
    throw error;
  }
}

/**
 * Deserializes YAML string to data
 */
export function deserializeFromYaml(yamlContent: string): ProjectDatabase {
  try {
    const rawData = yaml.load(yamlContent);
    // Validate and repair the data. .parse() will throw if it's invalid.
    // .default() on fields in the schema will auto-populate missing ones.
    return projectDatabaseSchema.parse(rawData);
  } catch (error) {
    console.error('Error deserializing or validating YAML:', error);
    throw error;
  }
}

/**
 * Generic YAML deserialization to any type
 */
export function deserializeDataFromYaml<T = any>(yamlContent: string): T {
  try {
    return yaml.load(yamlContent) as T;
  } catch (error) {
    console.error('Error deserializing data from YAML:', error);
    throw error;
  }
}